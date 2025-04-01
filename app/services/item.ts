import { Item, Prisma } from '@prisma/client';
import { createAppError, isAppError, AppError } from '../utils/errors';
import { createSearchService } from './search';
import { SearchIndicesSchema, TypeaheadConfigSchema } from '../types/search';
import { prisma } from '../lib/prisma';

export interface ItemService {
  list(options?: ListItemsOptions): Promise<{
    items: Item[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>;
  get(id: string): Promise<Item>;
  create(data: CreateItemInput): Promise<Item>;
  update(id: string, data: UpdateItemInput): Promise<Item>;
  delete(id: string): Promise<Item>;
}

export interface ListItemsOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}

export interface CreateItemInput {
  name: string;
  description: string;
  category_id: string;
  quantity: number;
  min_quantity?: number;
  unit: string;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  category_id?: string;
  quantity?: number;
  min_quantity?: number;
  unit?: string;
}

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

// Initialize search service
const searchService = createSearchService(searchIndices, typeaheadConfig);

export function createItemService(): ItemService {
  return {
    async list(options: ListItemsOptions = {}) {
      try {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        
        // Build the where clause
        const where: Prisma.ItemWhereInput = {};
        
        if (options.categoryId) {
          where.categoryId = options.categoryId;
        }
        
        if (options.search) {
          where.OR = [
            { name: { contains: options.search, mode: 'insensitive' } },
            { description: { contains: options.search, mode: 'insensitive' } }
          ];
        }
        
        // Get total count
        const total = await prisma.item.count({ where });
        
        // Get items with pagination
        const items = await prisma.item.findMany({
          where,
          skip,
          take: limit,
          include: {
            category: true,
            bins: {
              include: {
                bin: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });
        
        return {
          items,
          pagination: {
            page,
            pageSize: limit,
            total
          }
        };
      } catch (error) {
        console.error('Error listing items:', error);
        throw createAppError({
          code: 'ITEM_LIST_FAILED',
          message: 'Failed to list items',
          httpStatus: 500
        });
      }
    },
    
    async get(id: string) {
      try {
        const item = await prisma.item.findUnique({
          where: { id },
          include: {
            category: true,
            bins: {
              include: {
                bin: true
              }
            }
          }
        });
        
        if (!item) {
          throw createAppError({
            code: 'ITEM_NOT_FOUND',
            message: `Item with ID ${id} not found`,
            httpStatus: 404
          });
        }
        
        return item;
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error getting item:', error);
        throw createAppError({
          code: 'ITEM_GET_FAILED',
          message: 'Failed to get item',
          httpStatus: 500
        });
      }
    },
    
    async create(data: CreateItemInput) {
      try {
        // Check if category exists
        const category = await prisma.category.findUnique({
          where: { id: data.category_id }
        });
        
        if (!category) {
          throw createAppError({
            code: 'CATEGORY_NOT_FOUND',
            message: 'Specified category not found',
            httpStatus: 400
          });
        }

        // Create the item
        const item = await prisma.item.create({
          data: {
            name: data.name,
            description: data.description,
            category: { connect: { id: data.category_id } },
            quantity: data.quantity,
            minQuantity: data.min_quantity,
            unit: data.unit
          },
          include: {
            category: true
          }
        });

        // Index the item in Meilisearch
        try {
          await searchService.indexItem(item);
        } catch (error: Error | unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Failed to index item in search:', errorMessage);
          // Don't fail the request if indexing fails
        }
        
        return item;
      } catch (error: AppError | Error | unknown) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error creating item:', error);
        throw createAppError({
          code: 'ITEM_CREATE_FAILED',
          message: 'Failed to create item',
          httpStatus: 500
        });
      }
    },
    
    async update(id: string, data: UpdateItemInput) {
      try {
        // Check if item exists
        const existingItem = await prisma.item.findUnique({
          where: { id }
        });
        
        if (!existingItem) {
          throw createAppError({
            code: 'ITEM_NOT_FOUND',
            message: `Item with ID ${id} not found`,
            httpStatus: 404
          });
        }
        
        // Check if category exists if provided
        if (data.category_id && data.category_id !== '') {
          const category = await prisma.category.findUnique({
            where: { id: data.category_id }
          });
          
          if (!category) {
            throw createAppError({
              code: 'CATEGORY_NOT_FOUND',
              message: 'Specified category not found',
              httpStatus: 400
            });
          }
        }

        // Handle the update with different paths depending on category relationship
        let item;
        
        if (data.category_id === '') {
          // Disconnect category
          const updateData: any = {
            name: data.name !== undefined ? data.name : undefined,
            description: data.description !== undefined ? data.description : undefined,
            quantity: data.quantity !== undefined ? data.quantity : undefined,
            minQuantity: data.min_quantity !== undefined ? 
              (data.min_quantity === 0 ? null : data.min_quantity) : undefined,
            unit: data.unit !== undefined ? data.unit : undefined,
            categoryId: null
          };
          
          // Remove undefined values
          Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
          );
          
          item = await prisma.item.update({
            where: { id },
            data: updateData,
            include: { category: true }
          });
        } else if (data.category_id) {
          // Connect to new category
          item = await prisma.item.update({
            where: { id },
            data: {
              name: data.name,
              description: data.description,
              category: { connect: { id: data.category_id } },
              quantity: data.quantity,
              minQuantity: data.min_quantity === 0 ? null : data.min_quantity,
              unit: data.unit
            },
            include: { category: true }
          });
        } else {
          // Just update fields without touching category
          const updateData: any = {
            name: data.name !== undefined ? data.name : undefined,
            description: data.description !== undefined ? data.description : undefined,
            quantity: data.quantity !== undefined ? data.quantity : undefined,
            minQuantity: data.min_quantity !== undefined ? 
              (data.min_quantity === 0 ? null : data.min_quantity) : undefined,
            unit: data.unit !== undefined ? data.unit : undefined
          };
          
          // Remove undefined values
          Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
          );
          
          item = await prisma.item.update({
            where: { id },
            data: updateData,
            include: { category: true }
          });
        }
        
        return item;
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error updating item:', error);
        throw createAppError({
          code: 'ITEM_UPDATE_FAILED',
          message: 'Failed to update item',
          httpStatus: 500
        });
      }
    },
    
    async delete(id: string) {
      try {
        // Check if item exists
        const existingItem = await prisma.item.findUnique({
          where: { id },
          include: {
            bins: true
          }
        });
        
        if (!existingItem) {
          throw createAppError({
            code: 'ITEM_NOT_FOUND',
            message: `Item with ID ${id} not found`,
            httpStatus: 404
          });
        }
        
        // Check if item is in any bins
        if (existingItem.bins.length > 0) {
          throw createAppError({
            code: 'ITEM_IN_USE',
            message: 'Cannot delete an item that is stored in bins',
            httpStatus: 400
          });
        }
        
        return await prisma.item.delete({
          where: { id }
        });
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error deleting item:', error);
        throw createAppError({
          code: 'ITEM_DELETE_FAILED',
          message: 'Failed to delete item',
          httpStatus: 500
        });
      }
    }
  };
} 