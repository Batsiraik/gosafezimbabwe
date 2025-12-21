import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/home-services/register - Register as home service provider
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nationalIdUrl, selfieUrl, serviceIds } = body;

    // Log received data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Registration request:', {
        userId: decoded.userId,
        hasNationalId: !!nationalIdUrl,
        hasSelfie: !!selfieUrl,
        serviceIdsCount: serviceIds?.length || 0,
        serviceIds: serviceIds,
      });
    }

    // Validation
    if (!nationalIdUrl || !selfieUrl) {
      return NextResponse.json(
        { error: 'National ID and selfie are required' },
        { status: 400 }
      );
    }

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one service' },
        { status: 400 }
      );
    }

    // Verify all service IDs exist and are active
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'One or more selected services are invalid' },
        { status: 400 }
      );
    }

    // Check if service provider profile already exists
    const existingProvider = await prisma.serviceProvider.findUnique({
      where: { userId: decoded.userId },
    });

    // Use transaction to create/update provider and service associations
    // Increase timeout to 15 seconds to handle large image uploads
    const result = await prisma.$transaction(async (tx) => {
      let provider;
      
      if (existingProvider) {
        // Update existing provider
        provider = await tx.serviceProvider.update({
          where: { id: existingProvider.id },
          data: {
            nationalIdUrl,
            selfieUrl,
            isVerified: false, // Reset verification when updating
          },
        });

        // Delete existing service associations
        await tx.serviceProviderService.deleteMany({
          where: { serviceProviderId: provider.id },
        });
      } else {
        // Create new provider
        provider = await tx.serviceProvider.create({
          data: {
            userId: decoded.userId,
            nationalIdUrl,
            selfieUrl,
            isVerified: false, // Admin will verify
          },
        });
      }

      // Create service associations
      if (serviceIds.length > 0) {
        // Use createMany with skipDuplicates to avoid errors if duplicates exist
        try {
          await tx.serviceProviderService.createMany({
            data: serviceIds.map(serviceId => ({
              serviceProviderId: provider.id,
              serviceId,
            })),
            skipDuplicates: true,
          });
        } catch (createError: any) {
          // If createMany fails (e.g., due to unique constraint), try individual creates
          if (createError?.code === 'P2002') {
            // Delete and recreate to ensure clean state
            await tx.serviceProviderService.deleteMany({
              where: { serviceProviderId: provider.id },
            });
            await tx.serviceProviderService.createMany({
              data: serviceIds.map(serviceId => ({
                serviceProviderId: provider.id,
                serviceId,
              })),
              skipDuplicates: true,
            });
          } else {
            throw createError;
          }
        }
      }

      return provider;
    }, {
      maxWait: 20000, // Maximum time to wait for a transaction slot (20 seconds)
      timeout: 20000, // Maximum time the transaction can run (20 seconds) - increased for large image uploads
    });

    return NextResponse.json({
      message: 'Service provider registration submitted successfully',
      provider: result,
    });
  } catch (error: any) {
    console.error('Service provider registration error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to register service provider';
    if (error?.code === 'P2002') {
      errorMessage = 'A service provider profile already exists for this user';
    } else if (error?.code === 'P2003') {
      errorMessage = 'Invalid user or service reference';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
