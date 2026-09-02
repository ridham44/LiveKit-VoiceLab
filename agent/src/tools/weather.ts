import { tool } from '@livekit/agents';
import { weatherInputSchema, type WeatherOutput } from '@voicelab/shared';
import { env } from '../config.js';
import type { AgentUserData } from '../types.js';
import { runReportedTool } from './report.js';

export const weatherTool = tool<AgentUserData, typeof weatherInputSchema, WeatherOutput>({
  name: 'get_weather',
  description: 'Get the current weather conditions for a city.',
  parameters: weatherInputSchema,
  execute: async (args, { ctx }) =>
    runReportedTool(ctx.userData, 'get_weather', args, async () => {
      const res = await fetch(`${env.SERVER_URL}/api/tools/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      if (!res.ok) throw new Error(`weather tool failed: ${res.status} ${await res.text()}`);
      return (await res.json()) as WeatherOutput;
    }),
});
