/**
 * Prisma row -> shared DTO mapping. Kept separate from services so a service's business logic
 * doesn't get tangled up with serialization details (Date -> ISO string, JSON column casts).
 */
import type { Agent, AgentConfig, Call, KnowledgeDocument } from '@prisma/client';
import type { AgentConfigDto, AgentDto, CallListItemDto, KnowledgeDocumentDto } from '@voicelab/shared';
import { agentConfigInputSchema } from '@voicelab/shared';

export function toAgentConfigDto(config: AgentConfig): AgentConfigDto {
  const parsed = agentConfigInputSchema.parse({
    voiceSettings: config.voiceSettings,
    transcriptionSettings: config.transcriptionSettings,
    behaviorSettings: config.behaviorSettings,
    callSettings: config.callSettings,
    tools: config.tools,
  });
  return {
    ...parsed,
    id: config.id,
    agentId: config.agentId,
    isActive: config.isActive,
    createdAt: config.createdAt.toISOString(),
  };
}

export function toAgentDto(agent: Agent & { configs?: AgentConfig[] }): AgentDto {
  const activeConfig = agent.configs?.find((c) => c.isActive) ?? null;
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    isActive: agent.isActive,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
    activeConfig: activeConfig ? toAgentConfigDto(activeConfig) : null,
  };
}

export function toCallListItemDto(
  call: Call & { agent: { name: string }; _count?: { transcripts: number } },
  interruptionCount: number,
  turnCount: number,
): CallListItemDto {
  return {
    id: call.id,
    agentId: call.agentId,
    agentName: call.agent.name,
    roomName: call.roomName,
    status: call.status,
    terminationReason: call.terminationReason,
    startedAt: call.startedAt.toISOString(),
    endedAt: call.endedAt?.toISOString() ?? null,
    durationMs: call.durationMs,
    sttProvider: call.sttProvider,
    llmProvider: call.llmProvider,
    ttsProvider: call.ttsProvider,
    interruptionCount,
    turnCount,
  };
}

export function toKnowledgeDocumentDto(doc: KnowledgeDocument): KnowledgeDocumentDto {
  return {
    id: doc.id,
    agentId: doc.agentId,
    filename: doc.filename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    status: doc.status,
    errorMessage: doc.errorMessage,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
  };
}
