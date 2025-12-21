import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/services/seed - Seed initial services
export async function POST() {
  try {
    const initialServices = [
      { name: 'Plumber', iconName: 'Wrench' },
      { name: 'Electrician', iconName: 'Zap' },
      { name: 'Builder', iconName: 'Hammer' },
      { name: 'Gardener', iconName: 'Sprout' },
      { name: 'Dog Walker', iconName: 'Dog' },
      { name: 'Security', iconName: 'Shield' },
      { name: 'Carpenter', iconName: 'Square' },
      { name: 'Phone Repair', iconName: 'Phone' },
      { name: 'Computer Repair', iconName: 'Monitor' },
      { name: 'Cleaners', iconName: 'Sparkles' },
      { name: 'Grass Cutter', iconName: 'Scissors' },
    ];

    // Use upsert to avoid duplicates
    const createdServices = await Promise.all(
      initialServices.map((service) =>
        prisma.service.upsert({
          where: { name: service.name },
          update: {
            iconName: service.iconName,
            isActive: true,
          },
          create: {
            name: service.name,
            iconName: service.iconName,
            isActive: true,
          },
        })
      )
    );

    return NextResponse.json({
      message: 'Services seeded successfully',
      count: createdServices.length,
      services: createdServices,
    });
  } catch (error) {
    console.error('Error seeding services:', error);
    return NextResponse.json(
      { error: 'Failed to seed services' },
      { status: 500 }
    );
  }
}
