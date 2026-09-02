/**
 * Turns real AgentSession events into MetricEvent records, publishing each one twice from this
 * single call site: live on the LiveKit data channel (for the Live Test / Analytics tabs) and
 * persisted to the server (for Call History). See packages/shared/src/analytics.ts.
 */
import { AgentSessionEventTypes, type AgentSession } from '@livekit/agents';
import { LK_TOPICS, type MetricEvent, type MetricKind } from '@voicelab/shared';
import { env } from '../config.js';
import type { AgentUserData } from '../types.js';

async function emit(userData: AgentUserData, kind: MetricKind, valueMs?: number, meta?: Record<string, unknown>) {
  const event: MetricEvent = { callId: userData.callId, kind, valueMs, meta, createdAt: new Date().toISOString() };
  try {
    await userData.room.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify(event)), {
      topic: LK_TOPICS.metrics,
      reliable: true,
    });
  } catch (err) {
    console.error('[analytics] failed to publish live metric:', err);
  }
  fetch(`${env.SERVER_URL}/api/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
  }).catch((err) => console.error('[analytics] failed to persist metric:', err));
}

export function attachAnalyticsCollector(session: AgentSession<AgentUserData>, userData: AgentUserData): void {
  session.on(AgentSessionEventTypes.MetricsCollected, (ev) => {
    const m = ev.metrics;
    if (m.type === 'stt_metrics') emit(userData, 'stt_latency_ms', m.durationMs || undefined);
    else if (m.type === 'llm_metrics') emit(userData, 'llm_ttft_ms', m.ttftMs);
    else if (m.type === 'tts_metrics') emit(userData, 'tts_ttfb_ms', m.ttfbMs);
    else if (m.type === 'eou_metrics') {
      const total = m.endOfUtteranceDelayMs + m.transcriptionDelayMs;
      if (total > 0) emit(userData, 'total_response_latency_ms', total, { speechId: m.speechId });
    } else if (m.type === 'interruption_metrics' && m.numInterruptions > 0) {
      emit(userData, 'interruption');
    }
  });

  session.on(AgentSessionEventTypes.AgentFalseInterruption, () => emit(userData, 'false_interruption'));

  session.on(AgentSessionEventTypes.ConversationItemAdded, (ev) => {
    if (ev.item.type !== 'message') return;
    emit(userData, ev.item.role === 'user' ? 'turn_user' : 'turn_agent');
  });
}
