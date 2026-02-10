import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, headers } = req;
    const startTime = Date.now();

    // Extract IP address
    const ipAddress =
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.headers['x-real-ip']?.toString() ||
      req.connection?.remoteAddress ||
      'unknown';

    const userAgent = headers['user-agent'] || 'unknown';

    // Sanitize request body - remove sensitive fields
    const sanitizedBody = this.sanitizeRequestBody(body);

    // Log request
    this.logger.log(
      `${method} ${originalUrl} - IP: ${ipAddress} - User-Agent: ${userAgent}`,
    );

    // Only log body if it exists and is an object with keys
    if (
      sanitizedBody &&
      typeof sanitizedBody === 'object' &&
      Object.keys(sanitizedBody).length > 0 &&
      method !== 'GET'
    ) {
      this.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ipAddress}`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.debug(logMessage);
      }
    });

    next();
  }

  private sanitizeRequestBody(body: any): any {
    // Handle null, undefined, or non-object types
    if (body === null || body === undefined) {
      return null;
    }

    if (typeof body !== 'object') {
      return body;
    }

    // Handle arrays - return as is but log that it's an array
    if (Array.isArray(body)) {
      return body;
    }

    try {
      const sanitized = { ...body };
      const sensitiveFields = [
        'password',
        'token',
        'refreshToken',
        'accessToken',
        'secret',
        'apiKey',
        'authorization',
      ];

      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          const value = sanitized[field];
          if (typeof value === 'string' && value.length > 10) {
            sanitized[field] = value.substring(0, 10) + '...';
          } else {
            sanitized[field] = '***';
          }
        }
      }

      // Recursively sanitize nested objects
      for (const key in sanitized) {
        if (
          sanitized[key] &&
          typeof sanitized[key] === 'object' &&
          !Array.isArray(sanitized[key])
        ) {
          sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
        }
      }

      return sanitized;
    } catch (error) {
      // If sanitization fails, return null to avoid errors
      this.logger.warn(`Failed to sanitize request body: ${error.message}`);
      return null;
    }
  }
}
