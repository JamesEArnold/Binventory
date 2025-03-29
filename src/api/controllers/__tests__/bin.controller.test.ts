import { Request, Response } from 'express';
import { createBinController } from '../bin.controller';
import { BinService } from '../../../services/bin.service';
import { AppError } from '../../../utils/errors';
import { Bin } from '../../../types/models';

// Mock BinService
jest.mock('../../../services/bin.service');

// Mock variable declarations
let mockBinService: jest.Mocked<BinService>;
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let mockJson: jest.Mock;
let mockStatus: jest.Mock;

describe('BinController', () => {
  // Instance setup
  let binController: ReturnType<typeof createBinController>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Mock reset
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockRequest = {
      query: {},
      body: {},
      params: {},
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };
    mockBinService = {
      list: jest.fn(),
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // Instance creation
    binController = createBinController(mockBinService);
  });

  describe('list', () => {
    describe('happy paths', () => {
      it('should return bins with pagination', async () => {
        // Arrange
        const mockBin: Bin = {
          id: '1',
          label: 'test',
          location: 'test-location',
          qrCode: 'test-qr',
          description: 'test description',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const mockResult = {
          bins: [mockBin],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
          },
        };
        mockBinService.list.mockResolvedValueOnce(mockResult);

        // Act
        await binController.list(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockBinService.list).toHaveBeenCalledWith({
          page: undefined,
          limit: undefined,
          location: undefined,
          search: undefined,
        });
        expect(mockJson).toHaveBeenCalledWith({
          success: true,
          data: mockResult.bins,
          meta: {
            pagination: mockResult.pagination,
          },
        });
      });
    });

    describe('error cases', () => {
      it('should handle AppError', async () => {
        // Arrange
        const error = Object.assign(new AppError({
          code: 'TEST_ERROR',
          message: 'Test error',
          httpStatus: 400,
        }), { name: 'AppError' });
        mockBinService.list.mockRejectedValueOnce(error);

        // Act
        await binController.list(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'TEST_ERROR',
            message: 'Test error',
          },
        });
      });

      it('should throw unknown errors', async () => {
        // Arrange
        const error = new Error('Unknown error');
        mockBinService.list.mockRejectedValueOnce(error);

        // Act & Assert
        await expect(
          binController.list(mockRequest as Request, mockResponse as Response)
        ).rejects.toThrow('Unknown error');
      });
    });
  });

  describe('create', () => {
    describe('happy paths', () => {
      it('should create a bin and return 201', async () => {
        // Arrange
        const mockBin: Bin = {
          id: '1',
          label: 'test',
          location: 'test-location',
          qrCode: 'test-qr',
          description: 'test description',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockBinService.create.mockResolvedValueOnce(mockBin);

        // Act
        await binController.create(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockBinService.create).toHaveBeenCalledWith(mockRequest.body);
        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockJson).toHaveBeenCalledWith({
          success: true,
          data: mockBin,
        });
      });
    });

    describe('error cases', () => {
      it('should handle AppError', async () => {
        // Arrange
        const error = Object.assign(new AppError({
          code: 'BIN_ALREADY_EXISTS',
          message: 'Bin already exists',
          httpStatus: 409,
        }), { name: 'AppError' });
        mockBinService.create.mockRejectedValueOnce(error);

        // Act
        await binController.create(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'BIN_ALREADY_EXISTS',
            message: 'Bin already exists',
          },
        });
      });
    });
  });
}); 