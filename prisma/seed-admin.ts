// Run this script to create the super admin
// Usage: npx tsx prisma/seed-admin.ts
// Make sure to run: npx prisma generate first

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please make sure your .env.local file contains DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@gosafezw.com';
  const password = 'GoSafeZW#2026';
  const fullName = 'Super Admin';

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('Admin already exists. Updating password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.admin.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log('✅ Admin password updated successfully!');
  } else {
    // Create new admin
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
    });
    console.log('✅ Super admin created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
