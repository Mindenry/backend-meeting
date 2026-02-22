import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorCode: string | undefined;
    let details: any = undefined;

    // Handle HttpException (NestJS exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exceptionResponse;
        errorCode = (exceptionResponse as any).errorCode;
        details = (exceptionResponse as any).details;
      }
    }
    // Handle Prisma errors
    else if (exception && typeof exception === 'object' && 'code' in exception) {
      const prismaError = exception as any;
      status = HttpStatus.BAD_REQUEST;
      
      // Handle unique constraint violations
      if (prismaError.code === 'P2002') {
        message = 'A record with this value already exists';
        errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
        details = {
          field: prismaError.meta?.target,
        };
      }
      // Handle foreign key constraint violations
      else if (prismaError.code === 'P2003') {
        message = 'Referenced record does not exist';
        errorCode = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
      }
      // Handle record not found
      else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        errorCode = 'RECORD_NOT_FOUND';
      }
      else {
        message = 'Database operation failed';
        errorCode = 'DATABASE_ERROR';
      }
    }
    // Handle validation errors (class-validator)
    else if (exception instanceof Error) {
      message = exception.message;
      
      // Check if it's a validation error
      if (exception.message.includes('validation')) {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'VALIDATION_ERROR';
      }
    }

    // Log error with context
    const errorContext = {
      status,
      message,
      errorCode,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.id,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      timestamp: new Date().toISOString(),
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // Log based on severity
    if (status >= 500) {
      this.logger.error('Internal Server Error', errorContext);
    } else if (status >= 400) {
      this.logger.warn('Client Error', errorContext);
    } else {
      this.logger.debug('Error', errorContext);
    }

    // Build response
    const errorResponse: any = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : Array.isArray(message) ? message : (message as any).message || 'An error occurred',
    };

    // Add error code if available
    if (errorCode) {
      errorResponse.errorCode = errorCode;
    }

    // Add details if available (only in development)
    if (details && process.env.NODE_ENV !== 'production') {
      errorResponse.details = details;
    }

    // Add stack trace only in development
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}

