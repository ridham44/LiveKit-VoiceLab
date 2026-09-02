/**
 * Shared "report a tool call" helper — every tool in this directory calls this exactly twice
 * (stage: 'executing', then 'succeeded' | 'failed') so the Live Test panel and Actions tab can
 * render the full pipeline in real time (user request -> agent decides tool -> args -> execution
 * -> result -> reply), and so Call History has a permanent record afterward.
 */
import { randomUUID } from 'node:crypto';
import { LK_TOPICS, type ToolCallEvent, type ToolName } from '@voicelab/shared';
import { env } from '../config.js';
import type { AgentUserData } from '../types.js';

async function publishLive(userData: AgentUserData, event: ToolCallEvent): Promise<void> {
  try {
    await userData.room.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify(event)), {
      topic: LK_TOPICS.toolCalls,
      reliable: true,
    });
  } catch (err) {
    console.error('[tools] failed to publish live tool-call event:', err);
  }
}

async function persist(event: ToolCallEvent): Promise<void> {
  try {
    await fetch(`${env.SERVER_URL}/api/calls/tool-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: event.callId,
        toolName: event.toolName,
        args: event.args,
        result: event.result,
        errorMessage: event.error ?? null,
        status: event.stage === 'succeeded' ? 'SUCCESS' : 'ERROR',
        latencyMs: event.latencyMs ?? 0,
      }),
    });
  } catch (err) {
    console.error('[tools] failed to persist tool-call log:', err);
  }
}

export async function runReportedTool<TArgs, TResult>(
  userData: AgentUserData,
  toolName: ToolName,
  args: TArgs,
  fn: () => Promise<TResult>,
): Promise<TResult> {
  const toolCallId = randomUUID();
  const startedAt = Date.now();

  await publishLive(userData, {
    callId: userData.callId,
    toolCallId,
    toolName,
    stage: 'executing',
    args,
    createdAt: new Date().toISOString(),
  });

  try {
    const result = await fn();
    const event: ToolCallEvent = {
      callId: userData.callId,
      toolCallId,
      toolName,
      stage: 'succeeded',
      args,
      result,
      latencyMs: Date.now() - startedAt,
      createdAt: new Date().toISOString(),
    };
    await Promise.all([publishLive(userData, event), persist(event)]);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const event: ToolCallEvent = {
      callId: userData.callId,
      toolCallId,
      toolName,
      stage: 'failed',
      args,
      error: message,
      latencyMs: Date.now() - startedAt,
      createdAt: new Date().toISOString(),
    };
    await Promise.all([publishLive(userData, event), persist(event)]);
    throw err;
  }
}
