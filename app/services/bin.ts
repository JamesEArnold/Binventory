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
      'location',
      'user_id'
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
    userId: string;
  }): Promise<{
    bins: Bin[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>;
  create(data: Omit<Bin, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'> & { userId: string }): Promise<Bin>;
  get(id: string, userId: string): Promise<Bin>;
  update(id: string, data: Partial<Bin>, userId: string): Promise<Bin>;
  delete(id: string, userId: string): Promise<void>;
  searchBins(query: string, userId: string, filters?: Record<string, unknown>): Promise<SearchResult>;
}

export function createBinService({ 
  prismaClient = prisma,
  searchService = createSearchService(searchIndices, typeaheadConfig)
}: { 
  prismaClient?: PrismaClient;
  searchService?: ReturnType<typeof createSearchService>;
} = {}): BinService {
  return {
    async list({ page = 1, limit = 10, location, search, userId }) {
      const skip = (page - 1) * limit;
      
      // Use search service if available and search is provided
      if (searchService && search) {
        try {
          // Search with MeiliSearch
          const searchFilters: Record<string, unknown> = { user_id: userId };
          if (location) {
            searchFilters.location = location;
          }
          
          const searchResults = await searchService.search({
            query: search,
            filters: searchFilters,
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
        userId,
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
      // Check if bin with same label exists for this user
      const existingBin = await prismaClient.bin.findFirst({
        where: { 
          label: data.label,
          userId: data.userId
        },
      });

      if (existingBin) {
        throw createAppError({
          code: 'BIN_ALREADY_EXISTS',
          message: `A bin with label ${data.label} already exists for your account`,
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
      } catch (error) {
        console.error('Error creating bin:', error);
        // If creation fails due to a unique constraint violation, it means another request
        // created a bin with the same label between our check and create
        throw createAppError({
          code: 'BIN_ALREADY_EXISTS',
          message: `A bin with label ${data.label} already exists for your account`,
          httpStatus: 409,
        });
      }
    },

    async get(id, userId) {
      const bin = await prismaClient.bin.findFirst({
        where: { 
          id,
          userId 
        },
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

    async update(id, data, userId) {
      // Check if bin exists and belongs to user
      const existingBin = await prismaClient.bin.findFirst({
        where: { 
          id,
          userId 
        },
      });

      if (!existingBin) {
        throw createAppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with ID ${id} not found`,
          httpStatus: 404,
        });
      }

      // Check if new label conflicts with existing bin for this user
      if (data.label && data.label !== existingBin.label) {
        const binWithLabel = await prismaClient.bin.findFirst({
          where: { 
            label: data.label,
            userId,
            id: { not: id } // Exclude current bin
          },
        });

        if (binWithLabel) {
          throw createAppError({
            code: 'BIN_ALREADY_EXISTS',
            message: `A bin with label ${data.label} already exists for your account`,
            httpStatus: 409,
          });
        }
      }

      // Update the bin
      try {
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
      } catch (error) {
        console.error('Error updating bin:', error);
        throw createAppError({
          code: 'BIN_UPDATE_FAILED',
          message: `Failed to update bin: ${error instanceof Error ? error.message : 'Unknown error'}`,
          httpStatus: 500,
        });
      }
    },

    async delete(id, userId) {
      try {
        // Check if bin exists and belongs to user
        const bin = await prismaClient.bin.findFirst({
          where: { 
            id,
            userId 
          },
        });
        
        if (!bin) {
          throw createAppError({
            code: 'BIN_NOT_FOUND',
            message: `Bin with ID ${id} not found`,
            httpStatus: 404,
          });
        }
        
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
      } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'BIN_NOT_FOUND') {
          throw error;
        }
        
        throw createAppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with ID ${id} not found`,
          httpStatus: 404,
        });
      }
    },
    
    async searchBins(query, userId, filters = {}) {
      if (!searchService) {
        throw createAppError({
          code: 'SEARCH_UNAVAILABLE',
          message: 'Search service is not available',
          httpStatus: 503,
        });
      }
      
      try {
        // Add userId to filters
        const searchFilters = { ...filters, user_id: userId };
        
        const searchResults = await searchService.search({
          query,
          filters: searchFilters,
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