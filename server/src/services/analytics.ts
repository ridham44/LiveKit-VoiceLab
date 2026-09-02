/**
 * Cross-call analytics for a given agent. Aggregation happens in SQL over the raw CallMetric
 * event log (see prisma/schema.prisma) rather than pre-computed columns, so "average latency"
 * always reflects the exact same events the Live Test panel showed in real time.
 */
import { METRIC_KINDS, type MetricKind } from '@voicelab/shared';
import { prisma } from '../db/client.js';

export async function getAgentAnalytics(agentId: string) {
  const [summaryRows, historyRows, callAgg] = await Promise.all([
    prisma.$queryRaw<{ kind: string; count: bigint; avg_ms: number | null; min_ms: number | null; max_ms: number | null }[]>`
      SELECT cm.kind, COUNT(*)::bigint AS count, AVG(cm."valueMs") AS avg_ms, MIN(cm."valueMs") AS min_ms, MAX(cm."valueMs") AS max_ms
      FROM call_metrics cm
      JOIN calls c ON c.id = cm."callId"
      WHERE c."agentId" = ${agentId}
      GROUP BY cm.kind
    `,
    prisma.$queryRaw<{ bucket: Date; kind: string; avg_ms: number | null; count: bigint }[]>`
      SELECT date_trunc('hour', cm."createdAt") AS bucket, cm.kind, AVG(cm."valueMs") AS avg_ms, COUNT(*)::bigint AS count
      FROM call_metrics cm
      JOIN calls c ON c.id = cm."callId"
      WHERE c."agentId" = ${agentId} AND cm."createdAt" > NOW() - INTERVAL '48 hours'
      GROUP BY bucket, cm.kind
      ORDER BY bucket ASC
    `,
    prisma.call.aggregate({
      where: { agentId },
      _count: { id: true },
      _sum: { durationMs: true },
    }),
  ]);

  const summaryByKind = new Map(summaryRows.map((r) => [r.kind, r]));

  return {
    agentId,
    summaries: METRIC_KINDS.map((kind) => {
      const row = summaryByKind.get(kind);
      return {
        kind,
        count: row ? Number(row.count) : 0,
        avgMs: row?.avg_ms ?? null,
        minMs: row?.min_ms ?? null,
        maxMs: row?.max_ms ?? null,
      };
    }),
    history: historyRows.map((r) => ({
      bucket: r.bucket.toISOString(),
      kind: r.kind as MetricKind,
      avgMs: r.avg_ms,
      count: Number(r.count),
    })),
    callCount: callAgg._count.id,
    totalDurationMs: callAgg._sum.durationMs ?? 0,
  };
}
