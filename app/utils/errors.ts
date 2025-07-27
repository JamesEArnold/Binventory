import { AppError as IAppError } from '@/types/api';

export function createAppError({ code, message, httpStatus, details }: IAppError): IAppError {
  const error = new Error(message) as unknown as IAppError;
  error.code = code;
  error.httpStatus = httpStatus;
  error.details = details;
  return error;
}

export function isAppError(error: unknown): error is IAppError {
  return error instanceof Error && 'code' in error && 'httpStatus' in error;
} 