import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env.local file.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding pricing settings...');

  // Ride price per km
  const ridePrice = await prisma.appSettings.upsert({
    where: {
      key: 'ride_price_per_km',
    },
    update: {
      value: '0.60',
      description: 'Price per kilometer for ride service (in USD)',
    },
    create: {
      key: 'ride_price_per_km',
      value: '0.60',
      description: 'Price per kilometer for ride service (in USD)',
    },
  });

  // Parcel delivery price per km
  const parcelPrice = await prisma.appSettings.upsert({
    where: {
      key: 'parcel_price_per_km',
    },
    update: {
      value: '0.40',
      description: 'Price per kilometer for parcel delivery (in USD)',
    },
    create: {
      key: 'parcel_price_per_km',
      value: '0.40',
      description: 'Price per kilometer for parcel delivery (in USD)',
    },
  });

  // Parcel minimum price
  const parcelMinPrice = await prisma.appSettings.upsert({
    where: {
      key: 'parcel_min_price',
    },
    update: {
      value: '2.00',
      description: 'Minimum price for parcel delivery (in USD)',
    },
    create: {
      key: 'parcel_min_price',
      value: '2.00',
      description: 'Minimum price for parcel delivery (in USD)',
    },
  });

  console.log('Pricing settings seeded:', { ridePrice, parcelPrice, parcelMinPrice });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
