import { createQRCodeService } from '../qr';
import { prisma } from '../../lib/prisma';
import { QRCodeConfig, URLConfig } from '../../types/qr';

// Mock nanoid - this avoids the ESM import issue
jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockImplementation(() => 'mock-short-code')
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toString: jest.fn().mockResolvedValue('<svg>Mock QR Code</svg>')
}));

// Mock crypto's createHash
jest.mock('crypto', () => ({
  createHash: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue({
      slice: jest.fn().mockReturnValue('mock-checksum')
    })
  }))
}));

// Mock Prisma - ensure property naming matches the service implementation
jest.mock('../../lib/prisma', () => {
  // Define the mock implementation 
  const mockPrisma = {
    bin: {
      findUnique: jest.fn(),
    },
    // Use the same property name as in the service code
    qrCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  
  return {
    prisma: mockPrisma,
  };
});

// Type assertion for prisma to suppress TypeScript errors
// This tells TypeScript that prisma has the qrCode property
interface CustomPrismaClient {
  bin: {
    findUnique: jest.Mock;
  };
  qrCode: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
}

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
      ((prisma as unknown) as CustomPrismaClient).bin.findUnique.mockResolvedValue(mockBin);
      ((prisma as unknown) as CustomPrismaClient).qrCode.create.mockResolvedValue({});

      const result = await service.generateQRCode(mockBinId);

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('qrData');
      expect(result.qrData).toHaveProperty('binId', mockBinId);
      expect(result.qrData).toHaveProperty('version', '1.0');
      expect(result.qrData).toHaveProperty('shortCode');
      expect(result.qrData).toHaveProperty('timestamp');
      expect(result.qrData).toHaveProperty('checksum');

      // Verify QR code was stored
      expect(((prisma as unknown) as CustomPrismaClient).qrCode.create).toHaveBeenCalled();
    });

    it('should throw error if bin not found', async () => {
      ((prisma as unknown) as CustomPrismaClient).bin.findUnique.mockResolvedValue(null);

      await expect(service.generateQRCode(mockBinId)).rejects.toThrow('Bin not found');
    });
  });

  describe('validateQRCode', () => {
    const mockShortCode = 'abc123';
    const mockTimestamp = Date.now();
    const baseData = {
      version: '1.0',
      binId: mockBinId,
      shortCode: mockShortCode,
      timestamp: mockTimestamp,
    };
    
    // Since we can't directly call the generateChecksum function from the service,
    // we'll mock the data in a way that ensures the checksum validation passes
    const mockQRData = {
      ...baseData,
      checksum: 'mock-checksum',
    };

    it('should validate a valid QR code', async () => {
      // Mock the findUnique to return our QR data
      ((prisma as unknown) as CustomPrismaClient).qrCode.findUnique.mockResolvedValue({
        data: mockQRData,
        bin: mockBin,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });

      const result = await service.validateQRCode(mockShortCode);
      expect(result).toEqual(mockQRData);
    });

    it('should throw error if QR code not found', async () => {
      ((prisma as unknown) as CustomPrismaClient).qrCode.findUnique.mockResolvedValue(null);

      await expect(service.validateQRCode(mockShortCode)).rejects.toThrow('QR code not found');
    });

    it('should throw error if QR code expired', async () => {
      ((prisma as unknown) as CustomPrismaClient).qrCode.findUnique.mockResolvedValue({
        data: mockQRData,
        bin: mockBin,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      await expect(service.validateQRCode(mockShortCode)).rejects.toThrow('QR code expired');
    });

    it('should throw error if associated bin not found', async () => {
      ((prisma as unknown) as CustomPrismaClient).qrCode.findUnique.mockResolvedValue({
        data: mockQRData,
        bin: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expect(service.validateQRCode(mockShortCode)).rejects.toThrow('Associated bin not found');
    });
  });
}); 