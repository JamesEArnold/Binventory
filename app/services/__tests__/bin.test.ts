import { PrismaClient } from '@prisma/client';
import { BinService, createBinService } from '@/services/bin';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockFindUnique = jest.fn();
  const mockFindMany = jest.fn();
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockCount = jest.fn();

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      bin: {
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        count: mockCount,
      },
    })),
  };
});

describe('BinService', () => {
  let binService: BinService;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient = new PrismaClient() as jest.Mocked<PrismaClient>;
    binService = createBinService({ prismaClient: mockPrismaClient });
  });

  describe('create', () => {
    describe('happy paths', () => {
      it('should create a new bin successfully', async () => {
        // Arrange
        const binData = {
          label: 'test-bin',
          location: 'test-location',
          description: 'test description',
        };

        const expectedBin = {
          id: 'test-id',
          ...binData,
          qrCode: `bin:${binData.label}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrismaClient.bin.findUnique as jest.Mock).mockResolvedValueOnce(null);
        (mockPrismaClient.bin.create as jest.Mock).mockResolvedValueOnce(expectedBin);

        // Act
        const result = await binService.create(binData);

        // Assert
        expect(result).toEqual(expectedBin);
        expect(mockPrismaClient.bin.findUnique).toHaveBeenCalledWith({
          where: { label: binData.label },
        });
        expect(mockPrismaClient.bin.create).toHaveBeenCalledWith({
          data: {
            ...binData,
            qrCode: `bin:${binData.label}`,
          },
        });
      });
    });

    describe('error cases', () => {
      it('should throw an error if bin with same label exists', async () => {
        // Arrange
        const binData = {
          label: 'test-bin',
          location: 'test-location',
          description: 'test description',
        };

        const existingBin = {
          id: 'existing-id',
          ...binData,
          qrCode: 'existing-qr',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrismaClient.bin.findUnique as jest.Mock)
          .mockResolvedValueOnce(existingBin)
          .mockResolvedValueOnce(existingBin);

        // Act & Assert
        await expect(binService.create(binData)).rejects.toThrow(
          `A bin with label ${binData.label} already exists`
        );
        expect(mockPrismaClient.bin.findUnique).toHaveBeenCalledWith({
          where: { label: binData.label },
        });
        expect(mockPrismaClient.bin.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('get', () => {
    describe('happy paths', () => {
      it('should return a bin with its items', async () => {
        // Arrange
        const binId = 'test-id';
        const expectedBin = {
          id: binId,
          label: 'test-bin',
          location: 'test-location',
          description: 'test description',
          qrCode: 'test-qr',
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        };

        // Clear any previous mock implementations and create a new one
        jest.clearAllMocks();
        (mockPrismaClient.bin.findUnique as jest.Mock).mockReset();
        (mockPrismaClient.bin.findUnique as jest.Mock).mockResolvedValueOnce(expectedBin);

        // Act
        const result = await binService.get(binId);

        // Assert
        expect(result).toEqual(expectedBin);
        expect(mockPrismaClient.bin.findUnique).toHaveBeenCalledWith({
          where: { id: binId },
          include: { items: true }
        });
      });
    });

    describe('error cases', () => {
      it('should throw an error if bin is not found', async () => {
        // Arrange
        const binId = 'non-existent-id';
        
        // Clear any previous mock implementations and create a new one
        jest.clearAllMocks();
        (mockPrismaClient.bin.findUnique as jest.Mock).mockReset();
        (mockPrismaClient.bin.findUnique as jest.Mock).mockResolvedValueOnce(null);

        // Act & Assert
        await expect(binService.get(binId)).rejects.toThrow(
          `Bin with ID ${binId} not found`
        );
        expect(mockPrismaClient.bin.findUnique).toHaveBeenCalledWith({
          where: { id: binId },
          include: { items: true }
        });
      });
    });
  });
}); 