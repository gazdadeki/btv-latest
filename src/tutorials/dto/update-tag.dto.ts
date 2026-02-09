import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating an existing tag.
 *
 * @property {string} name - Tag name (optional, 1-100 characters)
 */
export class UpdateTagDto {
  @ApiPropertyOptional({
    example: 'Getting Started',
    description: 'Tag name',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
