-- Runs once, on first container init (fresh volume only), before Prisma migrations.
-- Installed on template1 (not just the app database) so any database created afterwards —
-- including Prisma's ephemeral shadow database used by `prisma migrate dev` — inherits the
-- `vector` type automatically instead of failing with "type vector does not exist".
\c template1
CREATE EXTENSION IF NOT EXISTS vector;
\c voicelab
CREATE EXTENSION IF NOT EXISTS vector;
