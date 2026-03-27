import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'BadRequestException' })
  error: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiPropertyOptional({ example: '/api/v1/games/1' })
  path: string;

  @ApiPropertyOptional({ example: 'GET' })
  method: string;
}
