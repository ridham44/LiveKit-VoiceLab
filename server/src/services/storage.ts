/**
 * S3-compatible object storage for uploaded knowledge-base documents.
 *
 * Works against any S3-compatible endpoint by construction (AWS S3, Cloudflare R2, Backblaze
 * B2, or the local MinIO container in docker-compose.yml) — only the S3_* env vars change
 * between environments. Only the original file bytes live here; extracted text/chunks/
 * embeddings are stored in Postgres (see services/knowledge.ts).
 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export function buildStorageKey(agentId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `knowledge/${agentId}/${randomUUID()}-${safeName}`;
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  const stream = res.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function getPresignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
