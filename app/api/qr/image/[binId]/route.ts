import { NextRequest, NextResponse } from 'next/server';
import { QRCodeConfig, URLConfig } from '@/types/qr';
import { createQRCodeService } from '@/services/qr';

const qrConfig: QRCodeConfig = {
  size: 300,
  errorCorrection: 'M',
  format: 'SVG',
  margin: 4,
};

const urlConfig: URLConfig = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  shortCodeLength: 8,
  expirationDays: 365, // 1 year
};

const qrService = createQRCodeService(qrConfig, urlConfig);

export async function GET(
  request: NextRequest,
  { params }: { params: { binId: string } }
) {
  try {
    const { binId } = await params;
    
    // Generate QR code or fetch from cache
    const { qrCode } = await qrService.generateQRCode(binId);
    
    // Return SVG content with appropriate headers
    return new NextResponse(qrCode, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('QR code image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
} 