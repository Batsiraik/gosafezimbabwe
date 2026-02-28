import { prisma } from '@/lib/prisma';

/** Minutes after which a ride still in "searching" is auto-cancelled (ride only, not parcel/home-services). */
const RIDE_SEARCHING_TIMEOUT_MINUTES = 2;

/**
 * Cancels ride requests that have been in "searching" for longer than the timeout.
 * Call this from ride-related endpoints (driver pending rides, rider active ride) so
 * drivers only see recent rides and riders see their ride as cancelled after timeout.
 */
export async function cancelRidesSearchingTooLong(): Promise<number> {
  const cutoff = new Date(Date.now() - RIDE_SEARCHING_TIMEOUT_MINUTES * 60 * 1000);
  const result = await prisma.rideRequest.updateMany({
    where: {
      status: 'searching',
      createdAt: { lt: cutoff },
    },
    data: { status: 'cancelled' },
  });
  if (result.count > 0) {
    console.log(`[RIDE AUTO-CANCEL] Cancelled ${result.count} ride(s) searching for > ${RIDE_SEARCHING_TIMEOUT_MINUTES} min`);
  }
  return result.count;
}
