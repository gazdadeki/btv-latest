import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_VERIFIED_KEY } from '../../common/decorators/require-verified.decorator';

@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireVerified = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requireVerified) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user?.isVerified) {
      throw new ForbiddenException('User must be verified');
    }
    return true;
  }
}
