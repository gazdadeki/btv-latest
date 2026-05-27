import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.access_token || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });

    this.logger.log('JWT Strategy initialized');
  }

  async validate(payload: any): Promise<User> {
    this.logger.debug(
      `JWT token validation attempt for user ID: ${payload.sub}, email: ${payload.email || 'unknown'}, role: ${payload.role || 'unknown'}`,
    );

    if (!payload.sub) {
      this.logger.error(
        'JWT token validation failed: Missing user ID (sub) in payload',
      );
      throw new UnauthorizedException(
        'JWT token validation failed: Invalid token payload',
      );
    }

    try {
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        this.logger.warn(
          `JWT token validation failed: User not found with ID: ${payload.sub}`,
        );
        throw new UnauthorizedException(
          `JWT token validation failed: User with ID ${payload.sub} not found`,
        );
      }

      if (user.voidedAt) {
        this.logger.warn(
          `JWT token validation failed: User ID ${user.id} is voided`,
        );
        throw new UnauthorizedException('User account is no longer active');
      }

      this.logger.debug(
        `JWT token validation successful for user ID: ${user.id}, email: ${user.email}`,
      );
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `JWT token validation error for user ID: ${payload.sub}: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException(
        `JWT token validation failed: ${error.message}`,
      );
    }
  }
}
