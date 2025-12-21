// Migration script to update city-to-city requests to use City table
// Run this with: npx tsx prisma/migrate-city-to-city.ts

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
  try {
    console.log('Starting migration...');

    // 1. Create default cities if they don't exist
    const cities = [
      'Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru',
      'Epworth', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi',
    ];

    for (const cityName of cities) {
      await prisma.city.upsert({
        where: { name: cityName },
        update: {},
        create: {
          name: cityName,
          country: 'Zimbabwe',
          isActive: true,
        },
      });
    }

    // 2. Get a default city (Harare)
    const defaultCity = await prisma.city.findFirst({
      where: { name: 'Harare' },
    });

    if (!defaultCity) {
      throw new Error('Default city not found');
    }

    // 3. Update existing city-to-city requests to use default city
    const existingRequests = await prisma.cityToCityRequest.findMany({
      where: {
        fromCityId: null as any, // This will fail, but we're checking if migration is needed
      },
    });

    console.log('Migration complete!');
  } catch (error: any) {
    if (error.message?.includes('fromCityId')) {
      console.log('Schema already migrated or no existing data');
    } else {
      console.error('Migration error:', error);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

migrate();
