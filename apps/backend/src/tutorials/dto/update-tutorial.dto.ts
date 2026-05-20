import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsNumber,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TutorialStatus } from '../entities/tutorial.entity';

/**
 * Data Transfer Object for updating an existing tutorial.
 *
 * All fields are optional - only provided fields will be updated.
 *
 * @property {string} title - Tutorial title
 * @property {string} slug - URL-friendly slug
 * @property {string} body - Markdown content body
 * @property {string} excerpt - Short description/excerpt
 * @property {TutorialStatus} status - Publication status
 * @property {number[]} tagIds - Array of tag IDs to associate
 * @property {number} categoryId - Category ID this tutorial belongs to
 */
export class UpdateTutorialDto {
  @ApiPropertyOptional({
    example: 'How to Reserve a Game Slot',
    description: 'Tutorial title',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'how-to-reserve-a-game-slot',
    description: 'URL-friendly slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({
    example: '# How to Reserve a Game Slot\n\nThis tutorial will guide you...',
    description: 'Markdown content body',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

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
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description:
      'YouTube video URL (youtube.com or youtu.be). Send empty string to clear.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o) => o.youtubeUrl !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/, {
    message: 'youtubeUrl must be a youtube.com or youtu.be URL',
  })
  youtubeUrl?: string;

  @ApiPropertyOptional({
    enum: TutorialStatus,
    description: 'Publication status',
  })
  @IsOptional()
  @IsEnum(TutorialStatus)
  status?: TutorialStatus;

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
    example: 1,
    description: 'Category ID this tutorial belongs to',
  })
  @IsOptional()
  @IsInt()
  categoryId?: number;
}
