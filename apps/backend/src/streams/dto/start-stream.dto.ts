import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartStreamDto {
  @ApiPropertyOptional({ description: 'Stream title' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: 'Stream URL', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  url: string;
}
