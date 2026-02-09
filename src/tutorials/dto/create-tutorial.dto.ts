import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TutorialStatus } from '../entities/tutorial.entity';

/**
 * Data Transfer Object for creating a new tutorial.
 *
 * @property {string} title - Tutorial title (required)
 * @property {string} slug - URL-friendly slug (optional, auto-generated if not provided)
 * @property {string} body - Markdown content body (required)
 * @property {string} excerpt - Short description/excerpt (optional)
 * @property {TutorialStatus} status - Publication status (default: DRAFT)
 * @property {boolean} featured - Whether tutorial is featured (default: false)
 * @property {number[]} tagIds - Array of tag IDs to associate (optional)
 * @property {number[]} categoryIds - Array of category IDs to associate (optional)
 */
export class CreateTutorialDto {
  @ApiProperty({
    example: 'How to Reserve a Game Slot',
    description: 'Tutorial title',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'how-to-reserve-a-game-slot',
    description:
      'URL-friendly slug (auto-generated from title if not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({
    example: '# How to Reserve a Game Slot\n\nThis tutorial will guide you...',
    description: 'Markdown content body',
  })
  @IsString()
  @MinLength(1)
  body: string;

  @ApiPropertyOptional({
    example: 'Learn how to reserve a game slot in just a few steps.',
    description: 'Short description/excerpt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({
    enum: TutorialStatus,
    default: TutorialStatus.DRAFT,
    description: 'Publication status',
  })
  @IsOptional()
  @IsEnum(TutorialStatus)
  status?: TutorialStatus;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether tutorial is featured/pinned',
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'Array of tag IDs to associate with this tutorial',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds?: number[];

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Array of category IDs to associate with this tutorial',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  categoryIds?: number[];
}
