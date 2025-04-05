import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { QRCodeData, QRCodeConfig, URLConfig } from '../types/qr';
import { prisma as prismaClient } from '../lib/prisma';

// Only use prisma in a server context
const prisma = typeof window === 'undefined' ? prismaClient : null;

function generateChecksum(data: Omit<QRCodeData, 'checksum'>): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 8);
}

function generateShortCode(length: number): string {
  return nanoid(length);
}

export function createQRCodeService(config: QRCodeConfig, urlConfig: URLConfig) {
  // Server-side only function
  async function generateQRCode(binId: string): Promise<{ qrCode: string; qrData: QRCodeData }> {
    if (!prisma) {
      throw new Error('This function can only be used server-side');
    }
    
    // Verify bin exists
    const bin = await prisma.bin.findUnique({ where: { id: binId } });
    if (!bin) {
      throw new Error('Bin not found');
    }

    // Generate QR data
    const baseData = {
      version: '1.0',
      binId,
      shortCode: generateShortCode(urlConfig.shortCodeLength),
      timestamp: Date.now(),
    };

    const qrData: QRCodeData = {
      ...baseData,
      checksum: generateChecksum(baseData),
    };

    // Generate QR code
    const url = `${urlConfig.baseUrl}/b/${qrData.shortCode}`;
    const qrCode = await QRCode.toString(url, {
      type: config.format === 'SVG' ? 'svg' : 'utf8',
      errorCorrectionLevel: config.errorCorrection,
      width: config.size,
      margin: config.margin,
    });

    // Store the mapping
    await prisma.qrCode.create({
      data: {
        binId: qrData.binId,
        shortCode: qrData.shortCode,
        data: qrData,
        expiresAt: urlConfig.expirationDays 
          ? new Date(Date.now() + urlConfig.expirationDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    return { qrCode, qrData };
  }

  // Server-side validation using Prisma
  async function validateQRCodeServer(shortCode: string): Promise<QRCodeData> {
    if (!prisma) {
      throw new Error('This function can only be used server-side');
    }
    
    const qrCode = await prisma.qrCode.findUnique({
      where: { shortCode },
      include: { bin: true },
    });

    if (!qrCode) {
      throw new Error('QR code not found');
    }

    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      throw new Error('QR code expired');
    }

    if (!qrCode.bin) {
      throw new Error('Associated bin not found');
    }

    const data = qrCode.data as QRCodeData;
    const { checksum, ...baseData } = data;
    const expectedChecksum = generateChecksum(baseData);

    if (checksum !== expectedChecksum) {
      throw new Error('Invalid QR code checksum');
    }

    return data;
  }

  // Client-side validation using API
  async function validateQRCodeClient(shortCode: string): Promise<QRCodeData> {
    const response = await fetch(`/api/qr/validate?code=${encodeURIComponent(shortCode)}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to validate QR code');
    }
    
    const data = await response.json();
    return data.data;
  }

  // Smart validate function that works in both environments
  async function validateQRCode(shortCode: string): Promise<QRCodeData> {
    // If we're in a browser environment, use the client method
    if (typeof window !== 'undefined') {
      return validateQRCodeClient(shortCode);
    }
    
    // Otherwise use the server method
    return validateQRCodeServer(shortCode);
  }

  return {
    generateQRCode,
    validateQRCode,
  };
} 