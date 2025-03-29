import { Request, Response } from 'express';
import { createBinService, BinService } from '../../services/bin.service';
import { ApiResponse } from '../../types/api';
import { Bin } from '../../types/models';
import { AppError } from '../../utils/errors';

interface BinController {
  list(req: Request, res: Response): Promise<void>;
  create(req: Request, res: Response): Promise<void>;
  get(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

export function createBinController(binService: BinService = createBinService()): BinController {
  async function list(req: Request, res: Response) {
    try {
      const { page, limit, location, search } = req.query;
      const result = await binService.list({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        location: location as string | undefined,
        search: search as string | undefined,
      });

      const response: ApiResponse<Bin[]> = {
        success: true,
        data: result.bins,
        meta: {
          pagination: result.pagination,
        },
      };

      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        const appError = error as AppError;
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        };
        res.status(appError.httpStatus).json(response);
      } else {
        throw error;
      }
    }
  }

  async function create(req: Request, res: Response) {
    try {
      const bin = await binService.create(req.body);
      const response: ApiResponse<Bin> = {
        success: true,
        data: bin,
      };
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        const appError = error as AppError;
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        };
        res.status(appError.httpStatus).json(response);
      } else {
        throw error;
      }
    }
  }

  async function get(req: Request, res: Response) {
    try {
      const bin = await binService.get(req.params.id);
      const response: ApiResponse<Bin> = {
        success: true,
        data: bin,
      };
      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        const appError = error as AppError;
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        };
        res.status(appError.httpStatus).json(response);
      } else {
        throw error;
      }
    }
  }

  async function update(req: Request, res: Response) {
    try {
      const bin = await binService.update(req.params.id, req.body);
      const response: ApiResponse<Bin> = {
        success: true,
        data: bin,
      };
      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        const appError = error as AppError;
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        };
        res.status(appError.httpStatus).json(response);
      } else {
        throw error;
      }
    }
  }

  async function deleteById(req: Request, res: Response) {
    try {
      await binService.delete(req.params.id);
      const response: ApiResponse<null> = {
        success: true,
      };
      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        const appError = error as AppError;
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        };
        res.status(appError.httpStatus).json(response);
      } else {
        throw error;
      }
    }
  }

  return {
    list,
    create,
    get,
    update,
    delete: deleteById,
  };
} 