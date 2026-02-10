import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new category.
 *
 * @property {string} name - Category name (required, 1-100 characters)
 * @property {string} description - Category description (optional)
 */
export class CreateCategoryDto {
  @ApiProperty({
    example: 'Game Guides',
    description: 'Category name',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Guides and tutorials for game mechanics',
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
