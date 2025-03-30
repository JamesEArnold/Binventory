import { createQRCodeService } from '../qr';
import { prisma } from '../../lib/prisma';
import { QRCodeConfig, URLConfig } from '../../types/qr';

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    bin: {
      findUnique: jest.fn(),
    },
    qrCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('QRCodeService', () => {
  const mockConfig: QRCodeConfig = {
    size: 300,
    errorCorrection: 'M',
    format: 'SVG',
    margin: 4,
  };

  const mockUrlConfig: URLConfig = {
    baseUrl: 'http://test.com',
    shortCodeLength: 8,
    expirationDays: 365,
  };

  const service = createQRCodeService(mockConfig, mockUrlConfig);
  const mockBinId = '123e4567-e89b-12d3-a456-426614174000';
  const mockBin = { id: mockBinId, label: 'Test Bin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateQRCode', () => {
    it('should generate a valid QR code', async () => {
      // Mock bin exists
      (prisma.bin.findUnique as jest.Mock).mockResolvedValue(mockBin);
      (prisma.qrCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.generateQRCode(mockBinId);

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('qrData');
      expect(result.qrData).toHaveProperty('binId', mockBinId);
      expect(result.qrData).toHaveProperty('version', '1.0');
      expect(result.qrData).toHaveProperty('shortCode');
      expect(result.qrData).toHaveProperty('timestamp');
      expect(result.qrData).toHaveProperty('checksum');

      // Verify QR code was stored
      expect(prisma.qrCode.create).toHaveBeenCalled();
    });

    it('should throw error if bin not found', async () => {
      (prisma.bin.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateQRCode(mockBinId)).rejects.toThrow('Bin not found');
    });
  });

  describe('validateQRCode', () => {
    const mockShortCode = 'abc123';
    const mockQRData = {
      version: '1.0',
      binId: mockBinId,
      shortCode: mockShortCode,
      timestamp: Date.now(),
      checksum: 'valid-checksum',
    };

    it('should validate a valid QR code', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue({
        data: mockQRData,
        bin: mockBin,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });

      const result = await service.validateQRCode(mockShortCode);
      expect(result).toEqual(mockQRData);
    });

    it('should throw error if QR code not found', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validateQRCode(mockShortCode)).rejects.toThrow('QR code not found');
    });

    it('should throw error if QR code expired', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue({
        data: mockQRData,
        bin: mockBin,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      await expect(service.validateQRCode(mockShortCode)).rejects.toThrow('QR code expired');
    });

    it('should throw error if associated bin not found', async () => {
      (prisma.qrCode.findUnique as jest.Mock).mockResolvedValue({
        data: mockQRData,
        bin: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(service.validateQRCode(mockShortCode)).rejects.toThrow('Associated bin not found');
    });
  });
}); 