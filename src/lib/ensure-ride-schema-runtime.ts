import { prisma } from '@/lib/prisma';

let rideSchemaEnsured = false;

/** Idempotent; fixes 500s when production DB predates recommendedPrice migration. */
export async function ensureRideRequestSchema(): Promise<void> {
  if (rideSchemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "ride_requests" ADD COLUMN IF NOT EXISTS "recommendedPrice" DOUBLE PRECISION;'
    );
    rideSchemaEnsured = true;
  } catch (err) {
    console.error('[ensure-ride-schema-runtime]', err);
  }
}
