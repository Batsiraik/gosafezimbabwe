import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [cities, total] = await Promise.all([
      prisma.city.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.city.count(),
    ]);

    return NextResponse.json({
      cities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, country } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'City name is required' }, { status: 400 });
    }

    const city = await prisma.city.create({
      data: {
        name,
        country: country || 'Zimbabwe',
      },
    });

    return NextResponse.json({ city, message: 'City created successfully' });
  } catch (error: any) {
    console.error('Error creating city:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'City already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create city' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cityId } = await request.json();

    if (!cityId) {
      return NextResponse.json({ error: 'City ID is required' }, { status: 400 });
    }

    await prisma.city.delete({
      where: { id: cityId },
    });

    return NextResponse.json({ message: 'City deleted successfully' });
  } catch (error) {
    console.error('Error deleting city:', error);
    return NextResponse.json({ error: 'Failed to delete city' }, { status: 500 });
  }
}
