// Mock next/server
jest.mock('next/server', () => {
  class MockNextRequest {
    private url: URL;
    private method: string;
    private body: string | null;

    constructor(input: string | URL, init?: { method?: string; body?: string }) {
      this.url = input instanceof URL ? input : new URL(input);
      this.method = init?.method || 'GET';
      this.body = init?.body || null;
    }

    async json() {
      return this.body ? JSON.parse(this.body) : null;
    }

    get nextUrl() {
      return this.url;
    }

    get searchParams() {
      return this.url.searchParams;
    }
  }

  class MockResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: {
          ...init?.headers,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockResponse,
  };
});

// Add global Response if not available in test environment
if (typeof Response === 'undefined') {
  global.Response = class MockResponse {
    private body: string;
    private init: ResponseInit;

    constructor(body: string | null, init?: ResponseInit) {
      this.body = body || '';
      this.init = init || {};
    }

    get status() {
      return this.init.status || 200;
    }

    async json() {
      return JSON.parse(this.body);
    }
  } as unknown as typeof Response;
}

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { createBinService, BinService } from '@/services/bin';
import { createAppError } from '@/utils/errors';
import { Bin } from '@/types/models';

// Mock BinService
jest.mock('@/services/bin');

// Mock variable declarations
let mockBinService: jest.Mocked<BinService>;
let mockRequest: NextRequest;

describe('Bin API Routes', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Mock reset
    mockBinService = {
      list: jest.fn(),
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<BinService>;
    (createBinService as jest.Mock).mockReturnValue(mockBinService);

    // Create mock request
    mockRequest = new NextRequest(new URL('http://localhost:3000/api/bins'), {
      method: 'GET',
    });
  });

  describe('GET /api/bins', () => {
    describe('happy paths', () => {
      it('should return bins with pagination', async () => {
        // Arrange
        const mockBin: Bin = {
          id: '1',
          label: 'test',
          location: 'test-location',
          qrCode: 'test-qr',
          description: 'test description',
          createdAt: '2025-03-29T18:17:20.726Z',
          updatedAt: '2025-03-29T18:17:20.726Z',
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
        const response = await GET(mockRequest, mockBinService);
        const data = await response.json();

        // Assert
        expect(mockBinService.list).toHaveBeenCalledWith({
          page: undefined,
          limit: undefined,
          location: undefined,
          search: undefined,
        });
        expect(data).toEqual({
          success: true,
          data: mockResult.bins,
          meta: {
            pagination: mockResult.pagination,
          },
        });
        expect(response.status).toBe(200);
      });

      it('should handle query parameters correctly', async () => {
        // Arrange
        mockRequest = new NextRequest(
          new URL('http://localhost:3000/api/bins?page=2&limit=5&location=warehouse&search=box'),
          { method: 'GET' }
        );
        mockBinService.list.mockResolvedValueOnce({
          bins: [],
          pagination: { page: 2, pageSize: 5, total: 0 },
        });

        // Act
        await GET(mockRequest, mockBinService);

        // Assert
        expect(mockBinService.list).toHaveBeenCalledWith({
          page: 2,
          limit: 5,
          location: 'warehouse',
          search: 'box',
        });
      });
    });

    describe('error cases', () => {
      it('should handle AppError', async () => {
        // Arrange
        const error = createAppError({
          code: 'TEST_ERROR',
          message: 'Test error',
          httpStatus: 400,
        });
        mockBinService.list.mockRejectedValueOnce(error);

        // Act
        const response = await GET(mockRequest, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data).toEqual({
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
        await expect(GET(mockRequest, mockBinService)).rejects.toThrow('Unknown error');
      });
    });
  });

  describe('POST /api/bins', () => {
    beforeEach(() => {
      // Reset request for POST tests
      mockRequest = new NextRequest('http://localhost:3000/api/bins', {
        method: 'POST',
        body: JSON.stringify({
          label: 'test',
          location: 'test-location',
          description: 'test description',
        }),
      });
    });

    describe('happy paths', () => {
      it('should create a bin and return 201', async () => {
        // Arrange
        const mockBin: Bin = {
          id: '1',
          label: 'test',
          location: 'test-location',
          qrCode: 'test-qr',
          description: 'test description',
          createdAt: '2025-03-29T18:17:20.726Z',
          updatedAt: '2025-03-29T18:17:20.726Z',
        };
        mockBinService.create.mockResolvedValueOnce(mockBin);

        // Act
        const response = await POST(mockRequest, mockBinService);
        const data = await response.json();

        // Assert
        expect(mockBinService.create).toHaveBeenCalledWith({
          label: 'test',
          location: 'test-location',
          description: 'test description',
        });
        expect(response.status).toBe(201);
        expect(data).toEqual({
          success: true,
          data: mockBin,
        });
      });
    });

    describe('error cases', () => {
      it('should handle AppError', async () => {
        // Arrange
        const error = createAppError({
          code: 'BIN_ALREADY_EXISTS',
          message: 'Bin already exists',
          httpStatus: 409,
        });
        mockBinService.create.mockRejectedValueOnce(error);

        // Act
        const response = await POST(mockRequest, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(409);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'BIN_ALREADY_EXISTS',
            message: 'Bin already exists',
          },
        });
      });

      it('should handle invalid JSON body', async () => {
        // Arrange
        mockRequest = new NextRequest('http://localhost:3000/api/bins', {
          method: 'POST',
          body: 'invalid json',
        });

        // Act
        const response = await POST(mockRequest, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
          },
        });
      });
    });
  });
}); 