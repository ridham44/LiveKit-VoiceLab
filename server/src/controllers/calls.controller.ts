import type { Request, Response } from 'express';
import { z } from 'zod';
import * as callsService from '../services/calls.js';

const metricEventSchema = z.object({
  callId: z.string(),
  kind: z.string(),
  valueMs: z.number().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});
const analyticsEventsSchema = z.object({ events: z.array(metricEventSchema) });

export async function list(req: Request, res: Response) {
  res.json(await callsService.listCalls(typeof req.query.agentId === 'string' ? req.query.agentId : undefined));
}

export async function get(req: Request, res: Response) {
  res.json(await callsService.getCallDetail(req.params.id));
}

export async function ingestAnalyticsEvents(req: Request, res: Response) {
  const input = analyticsEventsSchema.parse(req.body);
  await callsService.recordMetricEvents(input.events as never);
  res.status(202).json({ ok: true });
}

const transcriptSchema = z.object({
  callId: z.string(),
  role: z.enum(['USER', 'AGENT']),
  text: z.string(),
  isFinal: z.boolean(),
  language: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  timestampMs: z.number(),
});

export async function ingestTranscript(req: Request, res: Response) {
  const input = transcriptSchema.parse(req.body);
  await callsService.appendTranscript(input);
  res.status(202).json({ ok: true });
}

const toolCallLogSchema = z.object({
  callId: z.string(),
  toolName: z.string(),
  args: z.unknown(),
  result: z.unknown().optional(),
  errorMessage: z.string().nullable().optional(),
  status: z.enum(['SUCCESS', 'ERROR']),
  latencyMs: z.number(),
});

export async function ingestToolCall(req: Request, res: Response) {
  const input = toolCallLogSchema.parse(req.body);
  await callsService.recordToolCall({
    callId: input.callId,
    toolName: input.toolName,
    args: input.args,
    result: input.result ?? null,
    errorMessage: input.errorMessage ?? null,
    status: input.status,
    latencyMs: input.latencyMs,
  });
  res.status(202).json({ ok: true });
}
