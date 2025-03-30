import { Bin } from '@/types/models';
import { createAppError } from '@/utils/errors';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createSearchService } from './search';
import { SearchIndicesSchema, TypeaheadConfigSchema, SearchResult } from '../types/search';

// Initialize search configuration
const searchIndices = SearchIndicesSchema.parse({
  items: {
    primaryKey: 'id',
    searchableAttributes: [
      'name',
      'description',
      'category.name'
    ],
    filterableAttributes: [
      'category_id',
      'quantity',
      'unit'
    ],
    sortableAttributes: [
      'name',
      'created_at',
      'quantity'
    ],
    ranking: [
      'typo',
      'words',
      'proximity',
      'attribute',
      'exactness'
    ]
  },
  bins: {
    primaryKey: 'id',
    searchableAttributes: [
      'label',
      'location',
      'description'
    ],
    filterableAttributes: [
      'location'
    ]
  }
});

const typeaheadConfig = TypeaheadConfigSchema.parse({
  minChars: 2,
  maxResults: 10,
  timeout: 150,
  indexes: ['items', 'bins'],
  weights: {
    name: 10,
    label: 8,
    description: 3
  }
});

export interface BinService {
  list(params: {
    page?: number;
    limit?: number;
    location?: string;
    search?: string;
  }): Promise<{
    bins: Bin[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>;
  create(data: Omit<Bin, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>): Promise<Bin>;
  get(id: string): Promise<Bin>;
  update(id: string, data: Partial<Bin>): Promise<Bin>;
  delete(id: string): Promise<void>;
  searchBins(query: string, filters?: Record<string, unknown>): Promise<SearchResult>;
}

export function createBinService({ 
  prismaClient = prisma,
  searchService = createSearchService(searchIndices, typeaheadConfig)
}: { 
  prismaClient?: PrismaClient;
  searchService?: ReturnType<typeof createSearchService>;
} = {}): BinService {
  return {
    async list({ page = 1, limit = 10, location, search }) {
      const skip = (page - 1) * limit;
      
      // If there's a search query and MeiliSearch is available, use it
      if (search && searchService) {
        try {
          const searchResults = await searchService.search({
            query: search,
            filters: location ? { location } : undefined,
            limit,
            offset: skip
          });
          
          // Get the total count
          const total = searchResults.totalHits;
          
          return {
            bins: searchResults.hits as Bin[],
            pagination: {
              page,
              pageSize: limit,
              total,
            },
          };
        } catch (error) {
          console.error('Search error, falling back to database search:', error);
          // Fall back to database search if MeiliSearch fails
        }
      }
      
      // Default database search
      const where = {
        ...(location && { location }),
        ...(search && {
          OR: [
            { label: { contains: search } },
            { description: { contains: search } },
          ],
        }),
      };

      const [bins, total] = await Promise.all([
        prismaClient.bin.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prismaClient.bin.count({ where }),
      ]);

      return {
        bins,
        pagination: {
          page,
          pageSize: limit,
          total,
        },
      };
    },

    async create(data) {
      // Check if bin with same label exists
      const existingBin = await prismaClient.bin.findUnique({
        where: { label: data.label },
      });

      if (existingBin) {
        throw createAppError({
          code: 'BIN_ALREADY_EXISTS',
          message: `A bin with label ${data.label} already exists`,
          httpStatus: 409,
        });
      }

      // Create the bin
      const qrCode = `bin:${data.label}`;
      try {
        const bin = await prismaClient.bin.create({
          data: {
            ...data,
            qrCode,
          },
        });
        
        // Index the bin in search
        if (searchService) {
          try {
            await searchService.indexBin(bin);
          } catch (error) {
            console.error('Failed to index bin in search:', error);
            // Don't fail the bin creation if indexing fails
          }
        }
        
        return bin;
      } catch {
        // If creation fails due to a unique constraint violation, it means another request
        // created a bin with the same label between our check and create
        throw createAppError({
          code: 'BIN_ALREADY_EXISTS',
          message: `A bin with label ${data.label} already exists`,
          httpStatus: 409,
        });
      }
    },

    async get(id) {
      const bin = await prismaClient.bin.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!bin) {
        throw createAppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with ID ${id} not found`,
          httpStatus: 404,
        });
      }

      return bin;
    },

    async update(id, data) {
      // Check if bin exists
      const existingBin = await prismaClient.bin.findUnique({
        where: { id },
      });

      if (!existingBin) {
        throw createAppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with ID ${id} not found`,
          httpStatus: 404,
        });
      }

      // Check if new label conflicts with existing bin
      if (data.label && data.label !== existingBin.label) {
        const binWithLabel = await prismaClient.bin.findUnique({
          where: { label: data.label },
        });

        if (binWithLabel) {
          throw createAppError({
            code: 'BIN_ALREADY_EXISTS',
            message: `A bin with label ${data.label} already exists`,
            httpStatus: 409,
          });
        }
      }

      // Update the bin
      const updatedBin = await prismaClient.bin.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      
      // Update the bin in search
      if (searchService) {
        try {
          await searchService.indexBin(updatedBin);
        } catch (error) {
          console.error('Failed to update bin in search index:', error);
          // Don't fail the bin update if indexing fails
        }
      }

      return updatedBin;
    },

    async delete(id) {
      try {
        // Delete from database
        await prismaClient.bin.delete({
          where: { id },
        });
        
        // Delete from search index
        if (searchService) {
          try {
            await searchService.deleteBin(id);
          } catch (error) {
            console.error('Failed to delete bin from search index:', error);
            // Don't fail if search deletion fails
          }
        }
      } catch {
        throw createAppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with ID ${id} not found`,
          httpStatus: 404,
        });
      }
    },
    
    async searchBins(query, filters) {
      if (!searchService) {
        throw createAppError({
          code: 'SEARCH_UNAVAILABLE',
          message: 'Search service is not available',
          httpStatus: 503,
        });
      }
      
      try {
        const searchResults = await searchService.search({
          query,
          filters,
          limit: 20,
          offset: 0,
          indexes: ['bins']
        });
        
        return searchResults;
      } catch (error) {
        console.error('Search failed:', error);
        throw createAppError({
          code: 'SEARCH_FAILED',
          message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          httpStatus: 500,
        });
      }
    }
  };
} 