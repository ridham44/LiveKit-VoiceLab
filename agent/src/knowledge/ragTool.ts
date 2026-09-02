/**
 * Application RAG (◆ Custom — see packages/shared/src/capability.ts 'knowledge.rag'). The LLM
 * calls this tool when it decides a question needs the knowledge base; the retrieved chunks
 * come back as the tool result, so the *already-running* conversation LLM synthesizes the answer
 * using them as context — no separate, disconnected completion call.
 */
import { tool } from '@livekit/agents';
import { z } from 'zod';
import { env } from '../config.js';
import type { AgentUserData } from '../types.js';

const searchKnowledgeBaseSchema = z.object({ question: z.string().min(1) });

export const searchKnowledgeBaseTool = tool<AgentUserData, typeof searchKnowledgeBaseSchema>({
  name: 'search_knowledge_base',
  description: "Search the agent's uploaded knowledge-base documents for information relevant to the user's question. Always use this before answering questions about content that might be in uploaded documents.",
  parameters: searchKnowledgeBaseSchema,
  execute: async (args, { ctx }) => {
    const res = await fetch(`${env.SERVER_URL}/api/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: ctx.userData.agentId, question: args.question }),
    });
    if (!res.ok) throw new Error(`knowledge search failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { chunks: { filename: string; chunkIndex: number; score: number; content: string }[] };
    if (data.chunks.length === 0) {
      return { found: false, message: 'No relevant knowledge-base documents found.' };
    }
    return {
      found: true,
      sources: data.chunks.map((c) => ({ filename: c.filename, chunkIndex: c.chunkIndex, score: Math.round(c.score * 1000) / 1000 })),
      excerpts: data.chunks.map((c) => `From "${c.filename}": ${c.content}`),
    };
  },
});
