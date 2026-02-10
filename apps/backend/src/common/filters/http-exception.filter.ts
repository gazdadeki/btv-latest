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
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.constructor.name;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message || message;
        error = responseObj.error || exception.constructor.name;

        // Include validation errors if present
        if (Array.isArray(responseObj.message)) {
          details = responseObj.message;
          message = 'Validation failed';
        } else if (responseObj.details) {
          details = responseObj.details;
        }
      } else {
        message = exception.message || message;
        error = exception.constructor.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      error = exception.constructor.name;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown exception: ${JSON.stringify(exception)}`);
    }

    const ipAddress =
      request.ip ||
      request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      request.headers['x-real-ip']?.toString() ||
      request.connection?.remoteAddress ||
      'unknown';

    const errorResponse = {
      statusCode: status,
      message,
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Log the error with full context
    const logMessage = `HTTP ${status} ${request.method} ${request.url} - ${message} - IP: ${ipAddress}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    } else {
      this.logger.debug(logMessage);
    }

    response.status(status).json(errorResponse);
  }
}
