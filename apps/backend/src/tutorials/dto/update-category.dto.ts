import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating an existing category.
 *
 * @property {string} name - Category name (optional, 1-100 characters)
 * @property {string} description - Category description (optional)
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Game Guides',
    description: 'Category name',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Guides and tutorials for game mechanics',
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
