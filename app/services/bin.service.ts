import { Bin } from '@/types/models';
import { AppError } from '@/utils/errors';

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

export function createBinService(): BinService {
  // TODO: Implement actual database operations
  const bins = new Map<string, Bin>();

  return {
    async list({ page = 1, limit = 10, location, search }) {
      const filteredBins = Array.from(bins.values()).filter((bin) => {
        if (location && bin.location !== location) return false;
        if (search && !bin.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedBins = filteredBins.slice(start, end);

      return {
        bins: paginatedBins,
        pagination: {
          page,
          pageSize: limit,
          total: filteredBins.length,
        },
      };
    },

    async create(data) {
      const id = crypto.randomUUID();
      const now = new Date();
      const qrCode = `https://binventory.app/bins/${id}`;

      const bin: Bin = {
        id,
        label: data.label,
        location: data.location,
        description: data.description,
        qrCode,
        createdAt: now,
        updatedAt: now,
      };

      if (Array.from(bins.values()).some((b) => b.label === bin.label)) {
        throw new AppError({
          code: 'BIN_ALREADY_EXISTS',
          message: `A bin with label "${bin.label}" already exists`,
          httpStatus: 409,
        });
      }

      bins.set(id, bin);
      return bin;
    },

    async get(id) {
      const bin = bins.get(id);
      if (!bin) {
        throw new AppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with id "${id}" not found`,
          httpStatus: 404,
        });
      }
      return bin;
    },

    async update(id, data) {
      const bin = bins.get(id);
      if (!bin) {
        throw new AppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with id "${id}" not found`,
          httpStatus: 404,
        });
      }

      if (data.label && data.label !== bin.label) {
        if (Array.from(bins.values()).some((b) => b.label === data.label)) {
          throw new AppError({
            code: 'BIN_ALREADY_EXISTS',
            message: `A bin with label "${data.label}" already exists`,
            httpStatus: 409,
          });
        }
      }

      const updatedBin = {
        ...bin,
        ...data,
        id: bin.id,
        qrCode: bin.qrCode,
        createdAt: bin.createdAt,
        updatedAt: new Date(),
      };

      bins.set(id, updatedBin);
      return updatedBin;
    },

    async delete(id) {
      if (!bins.has(id)) {
        throw new AppError({
          code: 'BIN_NOT_FOUND',
          message: `Bin with id "${id}" not found`,
          httpStatus: 404,
        });
      }
      bins.delete(id);
    },
  };
} 