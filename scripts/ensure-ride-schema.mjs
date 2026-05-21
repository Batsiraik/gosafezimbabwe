/**
 * Ensures ride_requests has columns required by the current Prisma schema.
 * Safe to run on every build (idempotent). Fixes 500s on /api/rides/* when
 * migrations were never applied to an existing production database.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ride_requests" ADD COLUMN IF NOT EXISTS "recommendedPrice" DOUBLE PRECISION;'
  );
  console.log('[ensure-ride-schema] ride_requests.recommendedPrice is present.');
}

main()
  .catch((err) => {
    console.error('[ensure-ride-schema] Failed:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
