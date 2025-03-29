import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import { Bin, BinItem } from '../types/models';

const prisma = new PrismaClient();

interface BinServiceConfig {
  prismaClient?: PrismaClient;
}

export interface BinService {
  list(params: { page?: number; limit?: number; location?: string; search?: string }): Promise<{
    bins: Bin[];
    pagination: { page: number; pageSize: number; total: number };
  }>;
  create(data: Omit<Bin, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>): Promise<Bin>;
  get(id: string): Promise<Bin & { items: BinItem[] }>;
  update(id: string, data: Partial<Bin>): Promise<Bin>;
  delete(id: string): Promise<void>;
}

export function createBinService(config: BinServiceConfig = {}): BinService {
  const db = config.prismaClient || prisma;

  async function list(params: { page?: number; limit?: number; location?: string; search?: string }) {
    const { page = 1, limit = 10, location, search } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(location && { location }),
      ...(search && {
        OR: [
          { label: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [bins, total] = await Promise.all([
      db.bin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.bin.count({ where }),
    ]);

    return {
      bins,
      pagination: {
        page,
        pageSize: limit,
        total,
      },
    };
  }

  async function create(data: Omit<Bin, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>) {
    const existingBin = await db.bin.findUnique({
      where: { label: data.label },
    });

    if (existingBin) {
      throw new AppError({
        code: 'BIN_ALREADY_EXISTS',
        message: `A bin with label ${data.label} already exists`,
        httpStatus: 409,
      });
    }

    // Generate QR code (placeholder - will be implemented in Phase 1.2)
    const qrCode = `bin:${data.label}`;

    return db.bin.create({
      data: {
        ...data,
        qrCode,
      },
    });
  }

  async function get(id: string) {
    const bin = await db.bin.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!bin) {
      throw new AppError({
        code: 'BIN_NOT_FOUND',
        message: `Bin with ID ${id} not found`,
        httpStatus: 404,
      });
    }

    return bin;
  }

  async function update(id: string, data: Partial<Bin>) {
    const bin = await db.bin.findUnique({
      where: { id },
    });

    if (!bin) {
      throw new AppError({
        code: 'BIN_NOT_FOUND',
        message: `Bin with ID ${id} not found`,
        httpStatus: 404,
      });
    }

    if (data.label && data.label !== bin.label) {
      const existingBin = await db.bin.findUnique({
        where: { label: data.label },
      });

      if (existingBin) {
        throw new AppError({
          code: 'BIN_ALREADY_EXISTS',
          message: `A bin with label ${data.label} already exists`,
          httpStatus: 409,
        });
      }
    }

    return db.bin.update({
      where: { id },
      data,
    });
  }

  async function deleteById(id: string) {
    const bin = await db.bin.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!bin) {
      throw new AppError({
        code: 'BIN_NOT_FOUND',
        message: `Bin with ID ${id} not found`,
        httpStatus: 404,
      });
    }

    if (bin.items.length > 0) {
      throw new AppError({
        code: 'BIN_NOT_EMPTY',
        message: `Cannot delete bin with ID ${id} as it contains items`,
        httpStatus: 400,
      });
    }

    await db.bin.delete({
      where: { id },
    });
  }

  return {
    list,
    create,
    get,
    update,
    delete: deleteById,
  };
} 