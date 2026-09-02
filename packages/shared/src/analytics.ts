/**
 * Metric event shapes shared between the agent (producer) and client/server (consumers).
 *
 * The agent is the single point of truth: every kind below is derived directly from a real
 * AgentSession event (see agent/src/analytics/collector.ts) — nothing here is synthesized in the
 * UI. The agent publishes each event twice, from the same call site, so there is exactly one
 * definition of what a metric means:
 *   1. Live: as a data message on the `voicelab.metrics` LiveKit topic, for the connected
 *      browser's Analytics tab to render immediately.
 *   2. Persisted: POSTed to the server's /api/analytics/events, stored as a CallMetric row for
 *      Call History and cross-call aggregation.
 */
export const METRIC_KINDS = [
  'stt_latency_ms',
  'llm_ttft_ms',
  'tts_ttfb_ms',
  'total_response_latency_ms',
  'interruption',
  'false_interruption',
  'turn_user',
  'turn_agent',
] as const;
export type MetricKind = (typeof METRIC_KINDS)[number];

export interface MetricEvent {
  callId: string;
  kind: MetricKind;
  valueMs?: number;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsSummary {
  kind: MetricKind;
  count: number;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  current: number | null;
}

/** LiveKit data-stream / RPC identifiers shared by client and agent. Keep in sync on both ends. */
export const LK_TOPICS = {
  /** Agent → room: live MetricEvent JSON, one line per event (see MetricEvent above). */
  metrics: 'voicelab.metrics',
  /** Agent → room: live ToolCallEvent JSON (see tools.ts). */
  toolCalls: 'voicelab.tool_calls',
  /** Agent → room: live AgentStateEvent / turn-taking debug JSON. */
  turnEvents: 'voicelab.turn_events',
} as const;

export const LK_RPC = {
  /** Browser → agent participant: apply a partial AgentConfigInput immediately. */
  updateConfig: 'voicelab.updateConfig',
  /** Browser → agent participant: speak arbitrary text now (Test Voice button). */
  sayText: 'voicelab.sayText',
  /** Browser → agent participant: run one Actions/Tools example end-to-end (Test Tool button). */
  invokeTool: 'voicelab.invokeTool',
} as const;
