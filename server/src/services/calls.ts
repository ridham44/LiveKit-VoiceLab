/**
 * Call lifecycle + history. The agent process is the source of truth for what happened during a
 * call (it posts transcripts/metrics/tool-calls here as they occur, and calls `endCall` from its
 * JobContext shutdown callback) — this service only persists what it's told and answers reads.
 */
import type { MetricEvent } from '@voicelab/shared';
import { METRIC_KINDS } from '@voicelab/shared';
import type { Prisma, TerminationReason, TranscriptRole } from '@prisma/client';
import { prisma } from '../db/client.js';
import { toCallListItemDto } from '../models/mappers.js';
import { NotFoundError } from './agents.js';

export async function startCall(params: {
  agentId: string;
  configId: string;
  roomName: string;
  participantIdentity?: string;
  sttProvider: string;
  llmProvider: string;
  ttsProvider: string;
}) {
  return prisma.call.create({
    data: {
      agentId: params.agentId,
      configId: params.configId,
      roomName: params.roomName,
      participantIdentity: params.participantIdentity,
      sttProvider: params.sttProvider,
      llmProvider: params.llmProvider,
      ttsProvider: params.ttsProvider,
    },
  });
}

export async function endCall(callId: string, reason: TerminationReason) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new NotFoundError(`Call ${callId} not found`);
  const endedAt = new Date();
  return prisma.call.update({
    where: { id: callId },
    data: {
      status: reason === 'ERROR' ? 'FAILED' : 'COMPLETED',
      terminationReason: reason,
      endedAt,
      durationMs: endedAt.getTime() - call.startedAt.getTime(),
    },
  });
}

export async function appendTranscript(params: {
  callId: string;
  role: TranscriptRole;
  text: string;
  isFinal: boolean;
  language?: string | null;
  confidence?: number | null;
  timestampMs: number;
}) {
  return prisma.transcriptEntry.create({ data: params });
}

export async function recordMetricEvents(events: MetricEvent[]) {
  if (events.length === 0) return;
  await prisma.callMetric.createMany({
    data: events.map((e) => ({
      callId: e.callId,
      kind: e.kind,
      valueMs: e.valueMs ?? null,
      meta: (e.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}

export async function recordToolCall(params: {
  callId: string;
  toolName: string;
  args: unknown;
  result: unknown;
  errorMessage: string | null;
  status: 'SUCCESS' | 'ERROR';
  latencyMs: number;
}) {
  return prisma.toolCallLog.create({
    data: { ...params, args: params.args as Prisma.InputJsonValue, result: params.result as Prisma.InputJsonValue | undefined },
  });
}

export async function listCalls(agentId?: string) {
  const calls = await prisma.call.findMany({
    where: agentId ? { agentId } : undefined,
    include: {
      agent: { select: { name: true } },
      metrics: { where: { kind: { in: ['interruption', 'turn_user', 'turn_agent'] } } },
    },
    orderBy: { startedAt: 'desc' },
    take: 200,
  });
  return calls.map((call) => {
    const interruptionCount = call.metrics.filter((m) => m.kind === 'interruption').length;
    const turnCount = call.metrics.filter((m) => m.kind === 'turn_user' || m.kind === 'turn_agent').length;
    return toCallListItemDto(call, interruptionCount, turnCount);
  });
}

export async function getCallDetail(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      agent: { select: { name: true } },
      transcripts: { orderBy: { timestampMs: 'asc' } },
      toolCalls: { orderBy: { createdAt: 'asc' } },
      metrics: true,
    },
  });
  if (!call) throw new NotFoundError(`Call ${callId} not found`);

  const interruptionCount = call.metrics.filter((m) => m.kind === 'interruption').length;
  const turnCount = call.metrics.filter((m) => m.kind === 'turn_user' || m.kind === 'turn_agent').length;

  const metricsSummary = Object.fromEntries(
    METRIC_KINDS.map((kind) => {
      const values = call.metrics.filter((m) => m.kind === kind && m.valueMs != null).map((m) => m.valueMs as number);
      return [
        kind,
        {
          count: call.metrics.filter((m) => m.kind === kind).length,
          avgMs: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
          minMs: values.length ? Math.min(...values) : null,
          maxMs: values.length ? Math.max(...values) : null,
        },
      ];
    }),
  );

  return {
    ...toCallListItemDto(call, interruptionCount, turnCount),
    transcripts: call.transcripts.map((t) => ({
      id: t.id,
      role: t.role,
      text: t.text,
      isFinal: t.isFinal,
      language: t.language,
      confidence: t.confidence,
      timestampMs: t.timestampMs,
    })),
    toolCalls: call.toolCalls.map((tc) => ({
      id: tc.id,
      toolName: tc.toolName as never,
      args: tc.args,
      result: tc.result,
      errorMessage: tc.errorMessage,
      status: tc.status,
      latencyMs: tc.latencyMs,
      createdAt: tc.createdAt.toISOString(),
    })),
    metricsSummary: metricsSummary as never,
  };
}
