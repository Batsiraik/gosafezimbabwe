import { prisma } from '@/lib/prisma';

/** Effective distance for pricing (same rule as mobile: min 2 km when very short). */
export function effectiveRideDistanceKm(distanceKm: number): number {
  return distanceKm < 0.5 ? 2 : distanceKm;
}

export async function getRidePricingFromDb(): Promise<{
  ridePricePerKm: number;
  rideMinPrice: number;
}> {
  const settings = await prisma.appSettings.findMany({
    where: {
      key: { in: ['ride_price_per_km', 'ride_min_price'] },
    },
  });
  const obj: Record<string, string> = {};
  settings.forEach((s) => {
    obj[s.key] = s.value;
  });
  return {
    ridePricePerKm: parseFloat(obj['ride_price_per_km'] || '0.60'),
    rideMinPrice: parseFloat(obj['ride_min_price'] || '2.00'),
  };
}

export function computeRideRecommendedUsd(
  distanceKm: number,
  ridePricePerKm: number,
  isRoundTrip: boolean
): number {
  const d = effectiveRideDistanceKm(distanceKm);
  const base = ridePricePerKm * d * (isRoundTrip ? 2 : 1);
  return Math.round(base * 100) / 100;
}
