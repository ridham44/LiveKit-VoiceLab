/**
 * Knowledge base pipeline: upload -> extract text -> chunk -> embed -> store -> retrieve (RAG).
 *
 * Embeddings use OpenAI text-embedding-3-small (1536 dims, matching the KnowledgeChunk.embedding
 * column). Retrieval is real pgvector cosine-similarity search (the `<=>` operator) — never the
 * whole document is sent to the LLM, only the top-K matching chunks (see queryKnowledgeBase).
 */
import { randomUUID } from 'node:crypto';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { prisma } from '../db/client.js';
import { buildStorageKey, getObjectBuffer, uploadObject } from './storage.js';
import { toKnowledgeDocumentDto } from '../models/mappers.js';
import { NotFoundError } from './agents.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 150;

function openaiClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for knowledge-base embeddings (server/.env)');
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // .txt / .md / anything else: treat as plain text.
  return buffer.toString('utf-8');
}

function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = end - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const client = openaiClient();
  const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: chunks });
  return res.data.map((d) => d.embedding);
}

export async function uploadDocument(params: { agentId: string; filename: string; mimeType: string; buffer: Buffer }) {
  const agent = await prisma.agent.findUnique({ where: { id: params.agentId } });
  if (!agent) throw new NotFoundError(`Agent ${params.agentId} not found`);

  const storageKey = buildStorageKey(params.agentId, params.filename);
  await uploadObject(storageKey, params.buffer, params.mimeType);

  const doc = await prisma.knowledgeDocument.create({
    data: {
      agentId: params.agentId,
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.byteLength,
      storageKey,
      status: 'PENDING',
    },
  });

  processDocument(doc.id).catch((err) => {
    console.error(`[knowledge] processing failed for document ${doc.id}:`, err);
  });

  return toKnowledgeDocumentDto(doc);
}

async function processDocument(documentId: string): Promise<void> {
  await prisma.knowledgeDocument.update({ where: { id: documentId }, data: { status: 'PROCESSING' } });
  try {
    const doc = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id: documentId } });
    const buffer = await getObjectBuffer(doc.storageKey);
    const text = await extractText(buffer, doc.mimeType, doc.filename);
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: 'No extractable text found in document' },
      });
      return;
    }

    const embeddings = await embedChunks(chunks);

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId } });
      for (let i = 0; i < chunks.length; i++) {
        const id = randomUUID();
        const vectorLiteral = `[${embeddings[i].join(',')}]`;
        await tx.$executeRawUnsafe(
          `INSERT INTO knowledge_chunks (id, "documentId", "chunkIndex", content, "tokenCount", embedding, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())`,
          id,
          documentId,
          i,
          chunks[i],
          Math.ceil(chunks[i].length / 4),
          vectorLiteral,
        );
      }
      await tx.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'READY', chunkCount: chunks.length, errorMessage: null },
      });
    });
  } catch (err) {
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'FAILED', errorMessage: err instanceof Error ? err.message : String(err) },
    });
  }
}

export async function listDocuments(agentId: string) {
  const docs = await prisma.knowledgeDocument.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' } });
  return docs.map(toKnowledgeDocumentDto);
}

export async function deleteDocument(id: string) {
  await prisma.knowledgeDocument.delete({ where: { id } });
}

interface RetrievedChunk {
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  score: number;
}

/** Cosine-similarity search over pgvector. `1 - (embedding <=> query)` converts pgvector's
 * cosine *distance* operator into a similarity score in roughly [0, 1] for the UI. */
export async function retrieveRelevantChunks(agentId: string, question: string, topK = 5): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embedChunks([question]);
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;
  return prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT kc."documentId" AS "documentId", kd.filename AS filename, kc."chunkIndex" AS "chunkIndex",
            kc.content AS content, 1 - (kc.embedding <=> $1::vector) AS score
     FROM knowledge_chunks kc
     JOIN knowledge_documents kd ON kd.id = kc."documentId"
     WHERE kd."agentId" = $2 AND kd.status = 'READY'
     ORDER BY kc.embedding <=> $1::vector ASC
     LIMIT $3`,
    vectorLiteral,
    agentId,
    topK,
  );
}

export async function queryKnowledgeBase(agentId: string, question: string) {
  const started = Date.now();
  const chunks = await retrieveRelevantChunks(agentId, question);
  if (chunks.length === 0) {
    return {
      answer: "I don't have any knowledge-base documents to answer that yet — upload one first.",
      sources: [],
      latencyMs: Date.now() - started,
    };
  }

  const client = openaiClient();
  const context = chunks.map((c, i) => `[${i + 1}] (from ${c.filename})\n${c.content}`).join('\n\n');
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'Answer the user question using ONLY the provided context excerpts. Cite sources inline as [1], [2], etc. matching the excerpt numbers. If the context does not contain the answer, say so plainly.',
      },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
  });

  return {
    answer: completion.choices[0]?.message?.content ?? '(no answer generated)',
    sources: chunks.map((c) => ({
      documentId: c.documentId,
      filename: c.filename,
      chunkIndex: c.chunkIndex,
      score: c.score,
      excerpt: c.content.slice(0, 240),
    })),
    latencyMs: Date.now() - started,
  };
}
