import { IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { GameStatus } from '../entities/game.entity';

export class ListGamesQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scheduleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  streamId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
