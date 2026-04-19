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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, SubscriptionTier } from '../entities/user.entity';

/**
 * Data Transfer Object for creating a new user via admin API.
 * Used by administrators to create user accounts with full control over user properties.
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address (must be unique)',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'johndoe',
    description:
      'Username (3-14 characters; letters, numbers, and . - _ [ ] ( ) only, must be unique)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(14)
  @Matches(/^[A-Za-z0-9._\-()[\]]+$/, {
    message: 'Username can only contain letters, numbers, and . - _ [ ] ( )',
  })
  username?: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.PLAYER,
    description: 'User role (admin or player)',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
    description: 'Subscription tier (FREE or GOLD)',
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether the user is verified',
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fullName?: string;

  @ApiPropertyOptional({
    example: '123 Main Street',
    description: 'Address line 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  addressLine1?: string;

  @ApiPropertyOptional({
    example: 'Apt 4B',
    description: 'Address line 2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  addressLine2?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  city?: string;

  @ApiPropertyOptional({
    example: 'NY',
    description: 'State or province',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  state?: string;

  @ApiPropertyOptional({
    example: 'United States',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  country?: string;

  @ApiPropertyOptional({
    example: '10001',
    description: 'ZIP or postal code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  zipcode?: string;
}
