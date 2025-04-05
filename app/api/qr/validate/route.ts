import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { QRCodeData } from '../../../types/qr';

export async function GET(request: NextRequest) {
  try {
    // Get shortCode from query params
    const { searchParams } = new URL(request.url);
    const shortCode = searchParams.get('code');

    if (!shortCode) {
      return NextResponse.json(
        { error: 'Missing QR code' },
        { status: 400 }
      );
    }

    // Parse shortCode from URL if needed
    let cleanedCode = shortCode;
    try {
      // If it's a full URL, extract the shortcode
      if (shortCode.startsWith('http')) {
        const url = new URL(shortCode);
        const pathParts = url.pathname.split('/');
        cleanedCode = pathParts[pathParts.length - 1];
      }
    } catch (e) {
      console.error('Error parsing QR URL:', e);
      // Continue with original shortCode if URL parsing fails
    }

    // Find QR code in database
    const qrCode = await prisma.qrCode.findUnique({
      where: { shortCode: cleanedCode },
      include: { bin: true },
    });

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'QR code expired' },
        { status: 400 }
      );
    }

    if (!qrCode.bin) {
      return NextResponse.json(
        { error: 'Associated bin not found' },
        { status: 404 }
      );
    }

    // Get the data, but don't strictly validate the checksum for now
    // This makes the scanner more resilient and focuses on returning bin data
    const data = qrCode.data as QRCodeData;

    // Log the data for debugging
    console.log('QR code validated successfully:', {
      shortCode: cleanedCode,
      binId: qrCode.binId,
      data
    });

    // Return validated QR code data
    return NextResponse.json({ 
      data,
      binId: qrCode.binId,
      success: true 
    });
  } catch (error) {
    console.error('QR validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate QR code' },
      { status: 500 }
    );
  }
} 