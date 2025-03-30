import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createQRCodeService } from '@/services/qr';
import { QRCodeConfig, URLConfig } from '@/types/qr';

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

const GenerateRequestSchema = z.object({
  binId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { binId } = GenerateRequestSchema.parse(body);

    const { qrCode, qrData } = await qrService.generateQRCode(binId);

    return NextResponse.json({ qrCode, qrData });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const shortCode = request.nextUrl.searchParams.get('code');
    if (!shortCode) {
      return NextResponse.json(
        { error: 'Short code is required' },
        { status: 400 }
      );
    }

    const qrData = await qrService.validateQRCode(shortCode);
    return NextResponse.json({ qrData });
  } catch (error) {
    console.error('QR code validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
} 