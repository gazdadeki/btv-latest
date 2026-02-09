import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGameDto {
  @ApiPropertyOptional({ description: 'Team A name' })
  @IsString()
  @IsOptional()
  teamAName?: string;

  @ApiPropertyOptional({ description: 'Team B name' })
  @IsString()
  @IsOptional()
  teamBName?: string;

  @ApiPropertyOptional({ description: 'Is exclusive to gold subscribers?' })
  @IsBoolean()
  @IsOptional()
  isExclusiveToGold?: boolean;

  @ApiPropertyOptional({
    description: 'Game URL (inherited from schedule, editable by admin)',
  })
  @IsString()
  @IsOptional()
  url?: string | null;

  @ApiPropertyOptional({
    description: 'Scheduled start time (ISO datetime string)',
  })
  @IsDateString()
  @IsOptional()
  scheduledStartTime?: string;
}
