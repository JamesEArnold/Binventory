/**
 * QR Code Redirect Handler
 * 
 * This is a web route (not an API route) that handles QR code redirects.
 * It lives in the app directory (not app/api) because it handles direct web requests
 * and performs redirects rather than returning API data.
 * 
 * Flow:
 * 1. User scans QR code containing a short URL (e.g., /b/abc123)
 * 2. This route validates the short code
 * 3. User is redirected to the full bin URL (/bins/[binId])
 * 
 * Note: While API routes (/api/*) handle data endpoints returning JSON,
 * web routes like this one handle actual web navigation and page requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createQRCodeService } from '@/app/services/qr';
import { QRCodeConfig, URLConfig } from '@/app/types/qr';

const qrConfig: QRCodeConfig = {
  size: 300,
  errorCorrection: 'M',
  format: 'SVG',
  margin: 4,
};

const urlConfig: URLConfig = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  shortCodeLength: 8,
  expirationDays: 365,
};

const qrService = createQRCodeService(qrConfig, urlConfig);

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const qrData = await qrService.validateQRCode(code);
    
    // Redirect to the bin page
    return NextResponse.redirect(
      `${urlConfig.baseUrl}/bins/${qrData.binId}`
    );
  } catch (error) {
    console.error('QR code redirect error:', error);
    // Redirect to error page
    return NextResponse.redirect(
      `${urlConfig.baseUrl}/error?message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Invalid QR code'
      )}`
    );
  }
} 