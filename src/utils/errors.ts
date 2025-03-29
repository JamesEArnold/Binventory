import { AppError as IAppError } from '../types/api';

export class AppError extends Error implements IAppError {
  code: string;
  httpStatus: number;
  details?: Record<string, unknown>;

  constructor({ code, message, httpStatus, details }: IAppError) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.name = 'AppError';
  }
} 