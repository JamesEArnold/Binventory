import { Bin, BinItem } from './models';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
}

export interface AppError {
  code: string;        // e.g., "BIN_NOT_FOUND"
  message: string;     // User-friendly message
  details?: Record<string, unknown>;  // Additional context
  httpStatus: number;  // HTTP status code
}

// API Endpoint Types based on ROADMAP.md
export interface BinEndpoints {
  list: {
    query: {
      page?: number;
      limit?: number;
      location?: string;
      search?: string;
    };
    response: ApiResponse<Bin[]>;
  };
  
  create: {
    body: Omit<Bin, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>;
    response: ApiResponse<Bin>;
  };
  
  get: {
    params: { id: string };
    response: ApiResponse<Bin & { items: BinItem[] }>;
  };
  
  update: {
    params: { id: string };
    body: Partial<Bin>;
    response: ApiResponse<Bin>;
  };
  
  delete: {
    params: { id: string };
    response: ApiResponse<void>;
  };
} 