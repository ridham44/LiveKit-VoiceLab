/** Validated environment configuration for the agent worker process. */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// The project root .env is the primary place for shared secrets.  The package-specific
// file remains supported for local overrides and backwards compatibility.
const configDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(configDirectory, '../.env') });
dotenv.config({ path: resolve(configDirectory, '../../.env'), override: true });

const envSchema = z.object({
  LIVEKIT_URL: z.string().min(1, 'LIVEKIT_URL is required — see agent/.env.example'),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required — see agent/.env.example'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required — see agent/.env.example'),
  LIVEKIT_AGENT_NAME: z.string().default('voicelab-agent'),

  SERVER_URL: z.string().default('http://localhost:4100'),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
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

/** OpenRouter implements OpenAI-compatible chat, STT and TTS endpoints. */
export const openAiCompatible = {
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: env.OPENROUTER_BASE_URL,
};
