import { SetMetadata } from '@nestjs/common';

export const REQUIRE_NOT_BANNED_KEY = 'requireNotBanned';
export const RequireNotBanned = () => SetMetadata(REQUIRE_NOT_BANNED_KEY, true);
