import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new tag.
 *
 * @property {string} name - Tag name (required, 1-100 characters)
 */
export class CreateTagDto {
  @ApiProperty({
    example: 'Getting Started',
    description: 'Tag name',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
