// Prisma 7 requires a driver adapter for every runtime connection (the CLI's own connection,
// configured in prisma.config.ts, is separate from this). One pg Pool is shared by the whole
// process; PrismaClient wraps it rather than opening its own connections.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
