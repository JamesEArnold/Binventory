import { createPostgresSearchService } from '../search-postgres';
import { SearchIndices, TypeaheadConfig } from '@/types/search';

// Mock Prisma client
const mockPrismaClient = {
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  $executeRaw: jest.fn(),
  bin: {
    update: jest.fn(),
    findMany: jest.fn(),
  },
  item: {
    update: jest.fn(),
    findMany: jest.fn(),
  },
} as any;

describe('PostgresSearchService', () => {
  let searchService: ReturnType<typeof createPostgresSearchService>;
  let mockIndices: SearchIndices;
  let mockTypeaheadConfig: TypeaheadConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    mockIndices = {
      items: {
        primaryKey: 'id' as const,
        searchableAttributes: ['name', 'description', 'category.name'],
        filterableAttributes: ['category_id', 'quantity', 'unit'],
        sortableAttributes: ['name', 'created_at', 'quantity'],
        ranking: ['typo', 'words', 'proximity', 'attribute', 'exactness']
      },
      bins: {
        primaryKey: 'id' as const,
        searchableAttributes: ['label', 'location', 'description'],
        filterableAttributes: ['location']
      }
    };

    mockTypeaheadConfig = {
      minChars: 2,
      maxResults: 10,
      timeout: 150,
      indexes: ['items', 'bins'],
      weights: {
        name: 10,
        label: 8,
        description: 3
      }
    };

    searchService = createPostgresSearchService(
      mockIndices,
      mockTypeaheadConfig,
      mockPrismaClient
    );
  });

  describe('initializeIndices', () => {
    describe('happy paths', () => {
      it('should verify search vectors exist', async () => {
        mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 1 }]);

        await searchService.initializeIndices();

        expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(2);
      });
    });

    describe('error cases', () => {
      it('should throw error if search vectors do not exist', async () => {
        mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Column not found'));

        await expect(searchService.initializeIndices())
          .rejects.toThrow('Search infrastructure not initialized');
      });
    });
  });

  describe('search', () => {
    describe('happy paths', () => {
      it('should return empty results for empty query', async () => {
        const result = await searchService.search({
          query: '',
          limit: 20,
          offset: 0
        });

        expect(result).toEqual({
          hits: [],
          totalHits: 0,
          processingTimeMs: expect.any(Number),
          query: ''
        });
      });

      it('should search bins and items', async () => {
        const mockBinResults = [
          { id: 'bin1', label: 'Storage Bin', type: 'bin', rank: 0.8 }
        ];
        const mockItemResults = [
          { id: 'item1', name: 'Screwdriver', type: 'item', rank: 0.9 }
        ];

        mockPrismaClient.$queryRawUnsafe
          .mockResolvedValueOnce(mockBinResults)
          .mockResolvedValueOnce(mockItemResults);

        const result = await searchService.search({
          query: 'storage',
          limit: 20,
          offset: 0,
          indexes: ['bins', 'items']
        });

        expect(result.hits).toHaveLength(2);
        expect(result.hits[0]).toMatchObject({ name: 'Screwdriver', rank: 0.9 });
        expect(result.hits[1]).toMatchObject({ label: 'Storage Bin', rank: 0.8 });
        expect(result.totalHits).toBe(2);
      });
    });

    describe('error cases', () => {
      it('should handle database errors', async () => {
        mockPrismaClient.$queryRawUnsafe.mockRejectedValue(new Error('Database error'));

        await expect(searchService.search({
          query: 'test',
          limit: 20,
          offset: 0
        })).rejects.toThrow('Search failed');
      });
    });
  });

  describe('typeahead', () => {
    describe('happy paths', () => {
      it('should return empty array for short query', async () => {
        const result = await searchService.typeahead('a');
        expect(result).toEqual([]);
      });

      it('should call search for valid query', async () => {
        const mockBinResults: any[] = [];
        const mockItemResults = [
          { id: 'item1', name: 'Test Item', type: 'item', rank: 0.9 }
        ];

        mockPrismaClient.$queryRawUnsafe
          .mockResolvedValueOnce(mockBinResults)
          .mockResolvedValueOnce(mockItemResults);

        const result = await searchService.typeahead('test');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ name: 'Test Item' });
      });
    });

    describe('error cases', () => {
      it('should handle search errors', async () => {
        mockPrismaClient.$queryRawUnsafe.mockRejectedValue(new Error('Search error'));

        await expect(searchService.typeahead('test'))
          .rejects.toThrow('Typeahead search failed');
      });
    });
  });

  describe('indexAllBins', () => {
    describe('happy paths', () => {
      it('should update all bin search vectors', async () => {
        mockPrismaClient.$executeRaw.mockResolvedValue(undefined);

        await searchService.indexAllBins();

        expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
          expect.stringMatching(/UPDATE bins SET search_vector/)
        );
      });
    });

    describe('error cases', () => {
      it('should handle database errors', async () => {
        mockPrismaClient.$executeRaw.mockRejectedValue(new Error('Database error'));

        await expect(searchService.indexAllBins())
          .rejects.toThrow('Bin reindexing failed');
      });
    });
  });

  describe('indexAllItems', () => {
    describe('happy paths', () => {
      it('should update all item search vectors', async () => {
        mockPrismaClient.$executeRaw.mockResolvedValue(undefined);

        await searchService.indexAllItems();

        expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
          expect.stringMatching(/UPDATE items SET search_vector/)
        );
      });
    });

    describe('error cases', () => {
      it('should handle database errors', async () => {
        mockPrismaClient.$executeRaw.mockRejectedValue(new Error('Database error'));

        await expect(searchService.indexAllItems())
          .rejects.toThrow('Item reindexing failed');
      });
    });
  });
});