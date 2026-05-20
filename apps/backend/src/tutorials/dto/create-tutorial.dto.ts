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
 * @property {number[]} tagIds - Array of tag IDs to associate (optional)
 * @property {number} categoryId - Category ID this tutorial belongs to
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
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'YouTube video URL (youtube.com or youtu.be)',
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
    default: TutorialStatus.DRAFT,
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

  @ApiProperty({
    example: 1,
    description: 'Category ID this tutorial belongs to',
  })
  @IsInt()
  categoryId: number;
}
