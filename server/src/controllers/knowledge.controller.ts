import type { Request, Response } from 'express';
import { z } from 'zod';
import { knowledgeTestQuerySchema } from '@voicelab/shared';
import * as knowledgeService from '../services/knowledge.js';

const uploadBodySchema = z.object({ agentId: z.string().min(1) });

export async function upload(req: Request, res: Response) {
  const { agentId } = uploadBodySchema.parse(req.body);
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded (field name must be "file")' } });
    return;
  }
  const doc = await knowledgeService.uploadDocument({
    agentId,
    filename: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
  });
  res.status(201).json(doc);
}

export async function list(req: Request, res: Response) {
  const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined;
  if (!agentId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'agentId query param is required' } });
    return;
  }
  res.json(await knowledgeService.listDocuments(agentId));
}

export async function remove(req: Request, res: Response) {
  await knowledgeService.deleteDocument(req.params.id);
  res.status(204).end();
}

export async function test(req: Request, res: Response) {
  const input = knowledgeTestQuerySchema.parse(req.body);
  res.json(await knowledgeService.queryKnowledgeBase(input.agentId, input.question));
}

/** Retrieval only (no generation) — used by the agent's search_knowledge_base tool, so the
 * in-call LLM (already holding conversation context) synthesizes the answer itself instead of
 * paying for a second, disconnected completion. */
export async function search(req: Request, res: Response) {
  const input = knowledgeTestQuerySchema.parse(req.body);
  const chunks = await knowledgeService.retrieveRelevantChunks(input.agentId, input.question);
  res.json({ chunks: chunks.map((c) => ({ filename: c.filename, chunkIndex: c.chunkIndex, score: c.score, content: c.content })) });
}
