interface AppErrorParams {
  code: string;
  message: string;
  httpStatus: number;
  details?: unknown;
}

export class AppError extends Error {
  code: string;
  httpStatus: number;
  details?: unknown;

  constructor({ code, message, httpStatus, details }: AppErrorParams) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
} 