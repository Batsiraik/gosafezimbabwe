import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Seed some initial cities for Zimbabwe
const initialCities = [
  'Harare',
  'Bulawayo',
  'Chitungwiza',
  'Mutare',
  'Gweru',
  'Epworth',
  'Kwekwe',
  'Kadoma',
  'Masvingo',
  'Chinhoyi',
  'Marondera',
  'Norton',
  'Chegutu',
  'Bindura',
  'Zvishavane',
  'Victoria Falls',
  'Hwange',
  'Redcliff',
  'Rusape',
  'Chiredzi',
];

export async function POST(request: NextRequest) {
  try {
    // Check if cities already exist
    const existingCities = await prisma.city.findMany();
    
    if (existingCities.length > 0) {
      return NextResponse.json(
        { message: 'Cities already seeded', count: existingCities.length },
        { status: 200 }
      );
    }

    // Create cities
    const createdCities = await prisma.city.createMany({
      data: initialCities.map(name => ({
        name,
        country: 'Zimbabwe',
        isActive: true,
      })),
    });

    return NextResponse.json(
      { 
        message: 'Cities seeded successfully',
        count: createdCities.count 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Seed cities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
