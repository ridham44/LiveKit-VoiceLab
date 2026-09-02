// Prisma 7 moved datasource URLs and migration settings out of schema.prisma and into this
// config file (loaded by the Prisma CLI for `migrate`/`studio`/`db seed`). The running
// application still needs its own PrismaClient({ adapter }) — see src/db/client.ts — this file
// only configures the CLI.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx src/db/seed.ts',
  },
});
