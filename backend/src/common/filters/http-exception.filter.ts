import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomException, ErrorCode } from '../exceptions/custom-exceptions';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      success: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Handle CustomException
    if (exception instanceof CustomException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();
      errorResponse = {
        ...errorResponse,
        errorCode: exceptionResponse.errorCode,
        message: exceptionResponse.message,
        details: exceptionResponse.details,
      };
      this.logger.warn(`Custom Exception: ${exceptionResponse.errorCode} - ${exceptionResponse.message}`);
    }
    // Handle standard HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorResponse = {
        ...errorResponse,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message,
        details: typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
      };
      this.logger.warn(`HTTP Exception: ${status} - ${errorResponse.message}`);
    }
    // Handle Prisma errors
    else if (exception instanceof PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      errorResponse = {
        ...errorResponse,
        errorCode: ErrorCode.DATABASE_ERROR,
        message: this.handlePrismaError(exception),
      };
      this.logger.error(`Prisma Error: ${exception.code} - ${exception.message}`);
    }
    // Handle unknown errors
    else {
      errorResponse = {
        ...errorResponse,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      };
      this.logger.error('Unknown Exception:', exception);
    }

    // Log error stack in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = exception instanceof Error ? exception.stack : undefined;
    }

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        return `Unique constraint violation on ${(error.meta?.target as string[])?.join(', ')}`;
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Foreign key constraint failed';
      default:
        return 'Database error occurred';
    }
  }
}
