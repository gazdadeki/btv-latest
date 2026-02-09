import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_NOT_BANNED_KEY } from '../../common/decorators/require-not-banned.decorator';

@Injectable()
export class NotBannedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireNotBanned = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_NOT_BANNED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requireNotBanned) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (user?.isBanned) {
      const now = new Date();
      if (user.bannedUntil && user.bannedUntil > now) {
        throw new ForbiddenException(
          `User is banned until ${user.bannedUntil.toISOString()}`,
        );
      } else if (!user.bannedUntil) {
        throw new ForbiddenException('User is permanently banned');
      }
    }
    return true;
  }
}
