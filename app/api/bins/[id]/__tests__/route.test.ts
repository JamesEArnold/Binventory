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
import { GET, PUT, DELETE } from '../route';
import { createBinService, BinService } from '@/services/bin';
import { createAppError } from '@/utils/errors';
import { Bin } from '@/types/models';

// Mock BinService
jest.mock('@/services/bin');

// Mock variable declarations
let mockBinService: jest.Mocked<BinService>;
let mockRequest: NextRequest;

describe('Bin API Routes - Individual Operations', () => {
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

    // Create mock request and params
    mockRequest = new NextRequest(new URL('http://localhost:3000/api/bins/1'), {
      method: 'GET',
    });
  });

  describe('GET /api/bins/[id]', () => {
    describe('happy paths', () => {
      it('should return a bin by id', async () => {
        // Arrange
        const mockBin: Bin = {
          id: '1',
          label: 'test',
          location: 'test-location',
          qrCode: 'test-qr',
          description: 'test description',
          createdAt: '2025-03-29T18:17:20.561Z',
          updatedAt: '2025-03-29T18:17:20.561Z',
        };
        mockBinService.get.mockResolvedValueOnce(mockBin);

        // Act
        const response = await GET(mockRequest, { params: { id: '1' } }, mockBinService);
        const data = await response.json();

        // Assert
        expect(mockBinService.get).toHaveBeenCalledWith('1');
        expect(data).toEqual({
          success: true,
          data: mockBin,
        });
        expect(response.status).toBe(200);
      });
    });

    describe('error cases', () => {
      it('should handle AppError', async () => {
        // Arrange
        const binId = 'non-existent-id';
        const error = createAppError({
          code: 'BIN_NOT_FOUND',
          message: 'Bin not found',
          httpStatus: 404,
        });
        mockBinService.get.mockRejectedValueOnce(error);

        // Act
        const response = await GET(mockRequest, { params: { id: binId } }, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'BIN_NOT_FOUND',
            message: 'Bin not found',
          },
        });
      });

      it('should handle invalid id parameter', async () => {
        // Act
        const response = await GET(mockRequest, { params: {} }, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Missing id parameter',
          },
        });
      });
    });
  });

  describe('PUT /api/bins/[id]', () => {
    const binId = 'test-id';

    beforeEach(() => {
      // Reset request for PUT tests
      mockRequest = new NextRequest(`http://localhost:3000/api/bins/${binId}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: 'updated-test',
          location: 'updated-location',
          description: 'updated description',
        }),
      });
    });

    describe('happy paths', () => {
      it('should update a bin', async () => {
        // Arrange
        const mockBin: Bin = {
          id: binId,
          label: 'updated-test',
          location: 'updated-location',
          qrCode: 'test-qr',
          description: 'updated description',
          createdAt: '2025-03-29T18:17:20.561Z',
          updatedAt: '2025-03-29T18:17:20.561Z',
        };
        mockBinService.update.mockResolvedValueOnce(mockBin);

        // Act
        const response = await PUT(mockRequest, { params: { id: binId } }, mockBinService);
        const data = await response.json();

        // Assert
        expect(mockBinService.update).toHaveBeenCalledWith(binId, {
          label: 'updated-test',
          location: 'updated-location',
          description: 'updated description',
        });
        expect(response.status).toBe(200);
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
          code: 'BIN_NOT_FOUND',
          message: 'Bin not found',
          httpStatus: 404,
        });
        mockBinService.update.mockRejectedValueOnce(error);

        // Act
        const response = await PUT(mockRequest, { params: { id: binId } }, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'BIN_NOT_FOUND',
            message: 'Bin not found',
          },
        });
      });

      it('should handle invalid JSON body', async () => {
        // Arrange
        mockRequest = new NextRequest(`http://localhost:3000/api/bins/${binId}`, {
          method: 'PUT',
          body: 'invalid json',
        });

        // Act
        const response = await PUT(mockRequest, { params: { id: binId } }, mockBinService);
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

      it('should handle invalid id parameter', async () => {
        // Act
        const response = await PUT(mockRequest, { params: {} }, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Missing id parameter',
          },
        });
      });
    });
  });

  describe('DELETE /api/bins/[id]', () => {
    const binId = 'test-id';

    beforeEach(() => {
      // Reset request for DELETE tests
      mockRequest = new NextRequest(`http://localhost:3000/api/bins/${binId}`, {
        method: 'DELETE',
      });
    });

    describe('happy paths', () => {
      it('should delete a bin', async () => {
        // Arrange
        mockBinService.delete.mockResolvedValueOnce(undefined);

        // Act
        const response = await DELETE(mockRequest, { params: { id: binId } }, mockBinService);
        const data = await response.json();

        // Assert
        expect(mockBinService.delete).toHaveBeenCalledWith(binId);
        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
        });
      });
    });

    describe('error cases', () => {
      it('should handle bin not found', async () => {
        // Arrange
        const error = createAppError({
          code: 'BIN_NOT_FOUND',
          message: 'Bin not found',
          httpStatus: 404,
        });
        mockBinService.delete.mockRejectedValueOnce(error);

        // Act
        const response = await DELETE(mockRequest, { params: { id: binId } }, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'BIN_NOT_FOUND',
            message: 'Bin not found',
          },
        });
      });

      it('should handle invalid id parameter', async () => {
        // Act
        const response = await DELETE(mockRequest, { params: {} }, mockBinService);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data).toEqual({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Missing id parameter',
          },
        });
      });
    });
  });
}); 