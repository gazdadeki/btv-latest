import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, SubscriptionTier } from '../entities/user.entity';

/**
 * Data Transfer Object for updating a user via the admin API
 * (`PUT /admin/users/:id`). Every field is optional (partial update).
 *
 * This is the mass-assignment guard for the endpoint: the global
 * ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`, so ONLY the
 * fields declared here are accepted from the request body. Sensitive /
 * server-managed columns — `stripeCustomerId`, `isBanned`/`bannedUntil`,
 * `isVoided`/`voided*`, `id`, timestamps — are intentionally absent and any
 * attempt to set them is rejected with a 400. Ban/void have their own
 * dedicated endpoints. Field set mirrors `CreateUserDto` and the admin edit
 * form (`apps/web/.../users/_components/user-form-dialog.tsx`).
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email address (must be unique)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Username (3-14 characters; letters, numbers, and . - _ [ ] ( ) only)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(14)
  @Matches(/^[A-Za-z0-9._\-()[\]]+$/, {
    message: 'Username can only contain letters, numbers, and . - _ [ ] ( )',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'New password (minimum 6 characters); omit to keep current',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: SubscriptionTier,
    description: 'Subscription tier (FREE or GOLD)',
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @ApiPropertyOptional({ description: 'Whether the user is verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Full name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  city?: string;

  @ApiPropertyOptional({ description: 'State or province' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  state?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  country?: string;

  @ApiPropertyOptional({ description: 'ZIP or postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  zipcode?: string;
}
