import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const url = request.url;
    const method = request.method;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    this.logger.debug(
      `JWT Auth Guard activated for ${method} ${url} from IP: ${ip}`,
    );

    const result = super.canActivate(context);

    // Handle Promise result
    if (result instanceof Promise) {
      return result.then(
        (success) => {
          if (success) {
            this.logger.debug(
              `JWT Auth Guard: Authentication successful for ${method} ${url}`,
            );
          }
          return success;
        },
        (error) => {
          this.logger.warn(
            `JWT Auth Guard: Authentication failed for ${method} ${url} from IP: ${ip} - ${error?.message || 'Unknown error'}`,
          );
          throw error instanceof UnauthorizedException
            ? error
            : new UnauthorizedException(
                `Authentication failed: ${error?.message || 'Unknown error'}`,
              );
        },
      );
    }

    // Handle boolean result
    if (result === true) {
      this.logger.debug(
        `JWT Auth Guard: Authentication successful for ${method} ${url}`,
      );
    }

    return result;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    if (err) {
      this.logger.error(
        `JWT Auth Guard error for ${url}: ${err.message}`,
        err.stack,
      );
      throw err;
    }

    if (!user) {
      const reason = info?.message || 'Token validation failed';
      this.logger.warn(
        `JWT Auth Guard: No user found for ${url}, reason: ${reason}`,
      );
      throw new UnauthorizedException(`Authentication failed: ${reason}`);
    }

    this.logger.debug(
      `JWT Auth Guard: User authenticated successfully - User ID: ${user.id}, Email: ${user.email} for ${url}`,
    );
    return user;
  }
}
