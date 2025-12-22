import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: {
        key: 'whatsapp_support_number',
      },
    });

    if (!setting) {
      // Return default number if not set
      return NextResponse.json({ 
        number: '263776954448',
        message: 'Default number returned. Please add whatsapp_support_number to app_settings table.'
      });
    }

    return NextResponse.json({ 
      number: setting.value,
    });
  } catch (error) {
    console.error('Error fetching WhatsApp number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WhatsApp number' },
      { status: 500 }
    );
  }
}
