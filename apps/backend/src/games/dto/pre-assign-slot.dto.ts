import { IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PreAssignSlotDto {
  @ApiPropertyOptional({
    description: 'User ID to pre-assign (null to clear)',
  })
  @IsInt()
  @IsOptional()
  userId?: number | null;
}
