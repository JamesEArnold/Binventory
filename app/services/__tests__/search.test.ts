/**
 * @description Tests for the search service (Phase 2.1)
 */

import { createSearchService } from '../search';
import { SearchIndicesSchema, TypeaheadConfigSchema } from '../../types/search';

// Mock meilisearch module
jest.mock('../../lib/meilisearch', () => {
  return {
    meilisearch: {
      getIndex: jest.fn().mockImplementation(() => Promise.resolve(null)),
      createIndex: jest.fn().mockImplementation(() => Promise.resolve()),
      index: jest.fn().mockImplementation(() => ({
        updateSettings: jest.fn().mockImplementation(() => Promise.resolve()),
        addDocuments: jest.fn().mockImplementation(() => Promise.resolve()),
        deleteDocument: jest.fn().mockImplementation(() => Promise.resolve()),
        search: jest.fn().mockImplementation(() => Promise.resolve({
          hits: [{ id: '1', name: 'Test Item' }],
          estimatedTotalHits: 1,
          processingTimeMs: 5,
        })),
      })),
    },
  };
});

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    bin: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    },
    item: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    },
    category: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(null)),
    },
  },
}));

describe('Search Service', () => {
  // Test configurations
  const searchIndices = SearchIndicesSchema.parse({
    items: {
      primaryKey: 'id',
      searchableAttributes: ['name', 'description', 'category.name'],
      filterableAttributes: ['category_id', 'quantity', 'unit'],
      sortableAttributes: ['name', 'created_at', 'quantity'],
      ranking: ['typo', 'words', 'proximity', 'attribute', 'exactness'],
    },
    bins: {
      primaryKey: 'id',
      searchableAttributes: ['label', 'location', 'description'],
      filterableAttributes: ['location'],
    },
  });

  const typeaheadConfig = TypeaheadConfigSchema.parse({
    minChars: 2,
    maxResults: 10,
    timeout: 150,
    indexes: ['items', 'bins'],
    weights: {
      name: 10,
      label: 8,
      description: 3,
    },
  });

  let searchService: ReturnType<typeof createSearchService>;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = createSearchService(searchIndices, typeaheadConfig);
  });

  describe('Basic functionality', () => {
    it('should create a search service with the expected methods', () => {
      expect(searchService).toHaveProperty('initializeIndices');
      expect(searchService).toHaveProperty('indexAllBins');
      expect(searchService).toHaveProperty('indexAllItems');
      expect(searchService).toHaveProperty('indexBin');
      expect(searchService).toHaveProperty('indexItem');
      expect(searchService).toHaveProperty('deleteBin');
      expect(searchService).toHaveProperty('deleteItem');
      expect(searchService).toHaveProperty('search');
      expect(searchService).toHaveProperty('typeahead');
    });
  });

  describe('typeahead', () => {
    it('should return empty array for short queries', async () => {
      const result = await searchService.typeahead('a'); // Too short
      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('should handle empty queries', async () => {
      const result = await searchService.search({ 
        query: '',
        limit: 20,
        offset: 0
      });

      expect(result).toEqual({
        hits: [],
        totalHits: 0,
        processingTimeMs: 0,
        query: '',
      });
    });
  });
}); 