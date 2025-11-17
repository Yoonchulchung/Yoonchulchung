import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  // Auth errors (1000-1999)
  INVALID_CREDENTIALS = 'AUTH_1001',
  USER_ALREADY_EXISTS = 'AUTH_1002',
  TOKEN_EXPIRED = 'AUTH_1003',
  TOKEN_INVALID = 'AUTH_1004',
  UNAUTHORIZED = 'AUTH_1005',
  FORBIDDEN = 'AUTH_1006',

  // Resource errors (2000-2999)
  RESOURCE_NOT_FOUND = 'RESOURCE_2001',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_2002',

  // Validation errors (3000-3999)
  VALIDATION_ERROR = 'VALIDATION_3001',
  INVALID_INPUT = 'VALIDATION_3002',

  // Database errors (4000-4999)
  DATABASE_ERROR = 'DB_4001',
  TRANSACTION_ERROR = 'DB_4002',

  // External service errors (5000-5999)
  REDIS_ERROR = 'REDIS_5001',

  // Internal errors (9000-9999)
  INTERNAL_ERROR = 'INTERNAL_9001',
}

export class CustomException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus,
    public readonly details?: any,
  ) {
    super(
      {
        errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

export class AuthenticationException extends CustomException {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.UNAUTHORIZED, details?: any) {
    super(errorCode, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ResourceNotFoundException extends CustomException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(ErrorCode.RESOURCE_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ResourceAlreadyExistsException extends CustomException {
  constructor(resource: string, field: string, value: string) {
    super(
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      `${resource} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
    );
  }
}

export class ValidationException extends CustomException {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}

export class DatabaseException extends CustomException {
  constructor(message: string, details?: any) {
    super(ErrorCode.DATABASE_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
