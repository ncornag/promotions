
export const ErrorCode: Record<string, number> = {
  BAD_REQUEST: 400,
  UNPROCESSABLE_ENTITY: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}

export const ErrorName = {
  [ErrorCode.BAD_REQUEST]: 'Bad request',
  [ErrorCode.UNPROCESSABLE_ENTITY]: 'Unprocessable entity',
  [ErrorCode.UNAUTHORIZED]: 'Unathorized',
  [ErrorCode.FORBIDDEN]: 'Forbidden',
  [ErrorCode.NOT_FOUND]: 'Not found',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error'
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: Error[];

  constructor(
    statusCode: number = ErrorCode.BAD_REQUEST,
    message: string = ErrorName[statusCode],
    isOperational: boolean = true,
    errors: Error[] = []
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
