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
      'Username (3-30 characters, alphanumeric, underscores, and hyphens only, must be unique)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username must contain only alphanumeric characters, underscores, and hyphens',
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
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    example: '123 Main Street',
    description: 'Address line 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional({
    example: 'Apt 4B',
    description: 'Address line 2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 'NY',
    description: 'State or province',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    example: 'United States',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    example: '10001',
    description: 'ZIP or postal code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipcode?: string;
}
