import { prisma } from '../lib/prisma';
import { Category } from '@prisma/client';
import { createAppError, isAppError } from '../utils/errors';

export interface CategoryService {
  list(): Promise<Category[]>;
  get(id: string): Promise<Category>;
  create(data: CreateCategoryInput): Promise<Category>;
  update(id: string, data: UpdateCategoryInput): Promise<Category>;
  delete(id: string): Promise<Category>;
}

export interface CreateCategoryInput {
  name: string;
  parent_id?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  parent_id?: string;
}

export function createCategoryService(): CategoryService {
  return {
    async list() {
      try {
        return await prisma.category.findMany({
          include: {
            parent: true,
            _count: {
              select: {
                items: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });
      } catch (error) {
        console.error('Error listing categories:', error);
        throw createAppError({
          code: 'CATEGORY_LIST_FAILED',
          message: 'Failed to list categories',
          httpStatus: 500
        });
      }
    },

    async get(id: string) {
      try {
        const category = await prisma.category.findUnique({
          where: { id },
          include: {
            parent: true,
            children: true,
            _count: {
              select: {
                items: true
              }
            }
          }
        });

        if (!category) {
          throw createAppError({
            code: 'CATEGORY_NOT_FOUND',
            message: `Category with ID ${id} not found`,
            httpStatus: 404
          });
        }

        return category;
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error getting category:', error);
        throw createAppError({
          code: 'CATEGORY_GET_FAILED',
          message: 'Failed to get category',
          httpStatus: 500
        });
      }
    },

    async create(data: CreateCategoryInput) {
      try {
        // Calculate path based on parent
        let path: string[] = [];
        
        if (data.parent_id) {
          const parent = await prisma.category.findUnique({
            where: { id: data.parent_id },
            select: { path: true }
          });
          
          if (!parent) {
            throw createAppError({
              code: 'PARENT_CATEGORY_NOT_FOUND',
              message: 'Parent category not found',
              httpStatus: 400
            });
          }
          
          path = [...parent.path, data.parent_id];
        }
        
        return await prisma.category.create({
          data: {
            name: data.name,
            parentId: data.parent_id || null,
            path
          },
          include: {
            parent: true
          }
        });
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error creating category:', error);
        throw createAppError({
          code: 'CATEGORY_CREATE_FAILED',
          message: 'Failed to create category',
          httpStatus: 500
        });
      }
    },

    async update(id: string, data: UpdateCategoryInput) {
      try {
        // First check if the category exists
        const existingCategory = await prisma.category.findUnique({
          where: { id }
        });
        
        if (!existingCategory) {
          throw createAppError({
            code: 'CATEGORY_NOT_FOUND',
            message: `Category with ID ${id} not found`,
            httpStatus: 404
          });
        }
        
        // Calculate path based on parent
        let path = existingCategory.path;
        
        if (data.parent_id !== undefined) {
          if (data.parent_id === null || data.parent_id === '') {
            path = [];
          } else if (data.parent_id !== existingCategory.parentId) {
            // Check that the new parent exists
            const parent = await prisma.category.findUnique({
              where: { id: data.parent_id },
              select: { path: true, id: true }
            });
            
            if (!parent) {
              throw createAppError({
                code: 'PARENT_CATEGORY_NOT_FOUND',
                message: 'Parent category not found',
                httpStatus: 400
              });
            }
            
            // Check for circular reference
            if (parent.path.includes(id) || parent.id === id) {
              throw createAppError({
                code: 'CIRCULAR_REFERENCE',
                message: 'Cannot set parent to create a circular reference',
                httpStatus: 400
              });
            }
            
            path = [...parent.path, data.parent_id];
          }
        }
        
        return await prisma.category.update({
          where: { id },
          data: {
            name: data.name,
            parentId: data.parent_id === '' ? null : data.parent_id,
            path
          },
          include: {
            parent: true
          }
        });
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error updating category:', error);
        throw createAppError({
          code: 'CATEGORY_UPDATE_FAILED',
          message: 'Failed to update category',
          httpStatus: 500
        });
      }
    },

    async delete(id: string) {
      try {
        // Check if the category has children
        const childrenCount = await prisma.category.count({
          where: { parentId: id }
        });
        
        if (childrenCount > 0) {
          throw createAppError({
            code: 'CATEGORY_HAS_CHILDREN',
            message: 'Cannot delete a category that has child categories',
            httpStatus: 400
          });
        }
        
        // Check if the category has items
        const itemsCount = await prisma.item.count({
          where: { categoryId: id }
        });
        
        if (itemsCount > 0) {
          throw createAppError({
            code: 'CATEGORY_HAS_ITEMS',
            message: 'Cannot delete a category that has items',
            httpStatus: 400
          });
        }
        
        return await prisma.category.delete({
          where: { id }
        });
      } catch (error) {
        if (isAppError(error)) {
          throw error;
        }
        
        console.error('Error deleting category:', error);
        throw createAppError({
          code: 'CATEGORY_DELETE_FAILED',
          message: 'Failed to delete category',
          httpStatus: 500
        });
      }
    }
  };
} 