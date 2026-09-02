/**
 * Agent + AgentConfig business logic. Saving a new config never overwrites the previous one —
 * it inserts a new row and flips `isActive`, so configuration history is preserved and Call rows
 * keep pointing at the exact config that was live when that call happened (see prisma/schema.prisma
 * AgentConfig doc comment).
 */
import type { AgentConfigInput } from '@voicelab/shared';
import { defaultAgentConfig } from '@voicelab/shared';
import { prisma } from '../db/client.js';
import { toAgentConfigDto, toAgentDto } from '../models/mappers.js';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function listAgents() {
  const agents = await prisma.agent.findMany({
    include: { configs: { where: { isActive: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return agents.map(toAgentDto);
}

export async function getAgent(id: string) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { configs: { where: { isActive: true } } },
  });
  if (!agent) throw new NotFoundError(`Agent ${id} not found`);
  return toAgentDto(agent);
}

export async function createAgent(input: { name: string; description?: string }) {
  const agent = await prisma.agent.create({
    data: { name: input.name, description: input.description },
  });
  const config = await saveAgentConfigRaw(agent.id, defaultAgentConfig());
  return toAgentDto({ ...agent, configs: [config] });
}

export async function updateAgentMeta(id: string, input: { name?: string; description?: string; isActive?: boolean }) {
  const agent = await prisma.agent.update({ where: { id }, data: input });
  return getAgent(agent.id);
}

export async function deleteAgent(id: string) {
  await prisma.agent.delete({ where: { id } });
}

async function saveAgentConfigRaw(agentId: string, input: AgentConfigInput) {
  return prisma.$transaction(async (tx) => {
    await tx.agentConfig.updateMany({ where: { agentId, isActive: true }, data: { isActive: false } });
    return tx.agentConfig.create({
      data: {
        agentId,
        isActive: true,
        label: input.label,
        sttProvider: input.transcriptionSettings.sttProvider,
        llmProvider: input.behaviorSettings.llmProvider,
        ttsProvider: input.voiceSettings.ttsProvider,
        voiceSettings: input.voiceSettings,
        transcriptionSettings: input.transcriptionSettings,
        behaviorSettings: input.behaviorSettings,
        callSettings: input.callSettings,
        backgroundAudio: input.voiceSettings.backgroundAudio,
        tools: input.tools,
      },
    });
  });
}

export async function saveAgentConfig(agentId: string, input: AgentConfigInput) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new NotFoundError(`Agent ${agentId} not found`);
  const config = await saveAgentConfigRaw(agentId, input);
  return toAgentConfigDto(config);
}

export async function getActiveConfigForAgent(agentId: string) {
  const config = await prisma.agentConfig.findFirst({ where: { agentId, isActive: true }, orderBy: { createdAt: 'desc' } });
  if (!config) throw new NotFoundError(`No active configuration for agent ${agentId}`);
  return toAgentConfigDto(config);
}
