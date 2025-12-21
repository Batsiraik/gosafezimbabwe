import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const cities = await prisma.city.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        country: true,
        isActive: true,
      },
    });

    return NextResponse.json(
      { cities },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get cities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
