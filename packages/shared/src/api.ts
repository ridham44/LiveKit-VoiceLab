/**
 * REST API request/response DTOs shared between client and server. Keeping these in one place
 * means a route's response shape and the client's fetch hook can never silently drift apart.
 */
import { z } from 'zod';
import type { AgentConfigInput } from './settings.js';
import type { MetricKind } from './analytics.js';
import type { ToolName } from './tools.js';

export interface AgentDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeConfig: AgentConfigDto | null;
}

export interface AgentConfigDto extends AgentConfigInput {
  id: string;
  agentId: string;
  isActive: boolean;
  createdAt: string;
}

export const createAgentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});
export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const tokenRequestSchema = z.object({
  agentId: z.string().min(1),
  participantName: z.string().min(1).max(100).default('tester'),
});
export type TokenRequest = z.infer<typeof tokenRequestSchema>;

export interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  participantIdentity: string;
  agentIdentity: string;
}

export const sessionStartSchema = z.object({
  agentId: z.string().min(1),
  roomName: z.string().min(1),
});
export type SessionStartInput = z.infer<typeof sessionStartSchema>;

export interface SessionStartResponse {
  callId: string;
  roomName: string;
  dispatchId: string;
}

export const sessionEndSchema = z.object({
  callId: z.string().min(1),
  reason: z.enum(['USER_DISCONNECTED', 'MAX_DURATION_REACHED', 'SILENCE_TIMEOUT', 'IDLE_TIMEOUT', 'ERROR', 'MANUAL', 'UNKNOWN']).default('MANUAL'),
});
export type SessionEndInput = z.infer<typeof sessionEndSchema>;

export interface CallListItemDto {
  id: string;
  agentId: string;
  agentName: string;
  roomName: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  terminationReason: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  sttProvider: string;
  llmProvider: string;
  ttsProvider: string;
  interruptionCount: number;
  turnCount: number;
}

export interface CallDetailDto extends CallListItemDto {
  transcripts: {
    id: string;
    role: 'USER' | 'AGENT';
    text: string;
    isFinal: boolean;
    language: string | null;
    confidence: number | null;
    timestampMs: number;
  }[];
  toolCalls: {
    id: string;
    toolName: ToolName;
    args: unknown;
    result: unknown;
    errorMessage: string | null;
    status: 'SUCCESS' | 'ERROR';
    latencyMs: number;
    createdAt: string;
  }[];
  metricsSummary: Record<MetricKind, { avgMs: number | null; minMs: number | null; maxMs: number | null; count: number }>;
}

export interface KnowledgeDocumentDto {
  id: string;
  agentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
}

export const knowledgeTestQuerySchema = z.object({
  agentId: z.string().min(1),
  question: z.string().min(1).max(1000),
});
export type KnowledgeTestQuery = z.infer<typeof knowledgeTestQuerySchema>;

export interface KnowledgeTestResponse {
  answer: string;
  sources: { documentId: string; filename: string; chunkIndex: number; score: number; excerpt: string }[];
  latencyMs: number;
}

export interface AnalyticsResponse {
  agentId: string;
  summaries: {
    kind: MetricKind;
    count: number;
    avgMs: number | null;
    minMs: number | null;
    maxMs: number | null;
  }[];
  history: { bucket: string; kind: MetricKind; avgMs: number | null; count: number }[];
  callCount: number;
  totalDurationMs: number;
}

/** Standard error envelope returned by every route on failure. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
