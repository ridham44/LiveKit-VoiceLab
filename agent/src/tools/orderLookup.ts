import { tool } from '@livekit/agents';
import { orderLookupInputSchema, type OrderLookupOutput } from '@voicelab/shared';
import { env } from '../config.js';
import type { AgentUserData } from '../types.js';
import { runReportedTool } from './report.js';

export const orderLookupTool = tool<AgentUserData, typeof orderLookupInputSchema, OrderLookupOutput>({
  name: 'lookup_order',
  description: 'Look up the status of a customer order by order ID.',
  parameters: orderLookupInputSchema,
  execute: async (args, { ctx }) =>
    runReportedTool(ctx.userData, 'lookup_order', args, async () => {
      const res = await fetch(`${env.SERVER_URL}/api/tools/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      if (!res.ok) throw new Error(`order lookup tool failed: ${res.status} ${await res.text()}`);
      return (await res.json()) as OrderLookupOutput;
    }),
});
