/**
 * Validated environment configuration. Fails fast at boot with a clear message instead of
 * surfacing a confusing error deep inside a request handler later.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4100),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required — see server/.env.example'),

  LIVEKIT_URL: z.string().min(1, 'LIVEKIT_URL is required — see server/.env.example'),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required — see server/.env.example'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required — see server/.env.example'),
  LIVEKIT_AGENT_NAME: z.string().default('voicelab-agent'),

  OPENAI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVEN_API_KEY: z.string().optional(),
  CARTESIA_API_KEY: z.string().optional(),
  OPENWEATHER_API_KEY: z.string().optional(),

  S3_ENDPOINT: z.string().min(1, 'S3_ENDPOINT is required — see server/.env.example'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required — see server/.env.example'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID is required — see server/.env.example'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY is required — see server/.env.example'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy server/.env.example to server/.env and fill in the required values.');
  process.exit(1);
}

export const env = parsed.data;
