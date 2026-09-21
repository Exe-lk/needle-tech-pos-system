import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient() {
  // Prefer pooled URL (transaction pooler :6543). DIRECT_URL is for migrations.
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error(
      'Missing database URL. Set DATABASE_URL or DIRECT_URL in .env'
    );
  }

  // Keep pool small: serverless can spin many isolates; Supabase session pool is tiny.
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
// Always reuse across hot reloads and warm serverless invocations.
globalForPrisma.prisma = prisma;

export default prisma;
