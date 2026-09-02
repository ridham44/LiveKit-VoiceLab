/** Validated environment configuration for the agent worker process. */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  LIVEKIT_URL: z.string().min(1, 'LIVEKIT_URL is required — see agent/.env.example'),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required — see agent/.env.example'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required — see agent/.env.example'),
  LIVEKIT_AGENT_NAME: z.string().default('voicelab-agent'),

  SERVER_URL: z.string().default('http://localhost:4100'),

  OPENAI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVEN_API_KEY: z.string().optional(),
  CARTESIA_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid agent environment configuration:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy agent/.env.example to agent/.env and fill in the required values.');
  process.exit(1);
}

export const env = parsed.data;
