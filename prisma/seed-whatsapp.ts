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
  console.log('Seeding WhatsApp support number...');

  // Upsert the WhatsApp number setting
  const whatsappSetting = await prisma.appSettings.upsert({
    where: {
      key: 'whatsapp_support_number',
    },
    update: {
      value: '263776954448',
      description: 'WhatsApp support number for customer support',
    },
    create: {
      key: 'whatsapp_support_number',
      value: '263776954448',
      description: 'WhatsApp support number for customer support',
    },
  });

  console.log('WhatsApp number seeded:', whatsappSetting);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
