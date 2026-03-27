import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'BadRequestException' })
  error: string;

  @ApiPropertyOptional({
    description: 'Validation errors or additional context',
  })
  details?: any;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/games/1' })
  path: string;

  @ApiProperty({ example: 'GET' })
  method: string;
}
