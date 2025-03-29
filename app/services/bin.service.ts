import { Bin } from '@/types/models';
import { AppError } from '@/utils/errors';
import { PrismaClient } from '@prisma/client';

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
}

export function createBinService({ prismaClient }: { prismaClient: PrismaClient }): BinService {
  return {
    async list({ page = 1, limit = 10, location, search }) {
      const skip = (page - 1) * limit;
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
        throw new AppError({
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
        return bin;
      } catch {
        // If creation fails due to a unique constraint violation, it means another request
        // created a bin with the same label between our check and create
        throw new AppError({
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
        throw new AppError({
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
        throw new AppError({
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
          throw new AppError({
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

      return updatedBin;
    },

    async delete(id) {
      try {
        await prismaClient.bin.delete({
          where: { id },
        });
      } catch {
        throw new AppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with ID ${id} not found`,
          httpStatus: 404,
        });
      }
    },
  };
} 