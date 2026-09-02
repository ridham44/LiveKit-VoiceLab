import { tool } from '@livekit/agents';
import { appointmentInputSchema, type AppointmentOutput } from '@voicelab/shared';
import { env } from '../config.js';
import type { AgentUserData } from '../types.js';
import { runReportedTool } from './report.js';

export const appointmentTool = tool<AgentUserData, typeof appointmentInputSchema, AppointmentOutput>({
  name: 'book_appointment',
  description: 'Book an appointment for a customer on a given date, time, and service.',
  parameters: appointmentInputSchema,
  execute: async (args, { ctx }) =>
    runReportedTool(ctx.userData, 'book_appointment', args, async () => {
      const res = await fetch(`${env.SERVER_URL}/api/tools/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      if (!res.ok) throw new Error(`appointment tool failed: ${res.status} ${await res.text()}`);
      return (await res.json()) as AppointmentOutput;
    }),
});
