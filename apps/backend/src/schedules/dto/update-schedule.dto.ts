import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceType, RefundPolicy } from '../entities/schedule.entity';
import { SlotConfigDto } from './create-schedule.dto';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Schedule name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Schedule description' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ enum: RecurrenceType, description: 'Recurrence type' })
  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({ description: 'Recurrence days (array of numbers)' })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  recurrenceDays?: number[] | null;

  @ApiPropertyOptional({
    description: 'Recurrence pattern for YEARLY/ONCE type',
  })
  @IsOptional()
  recurrencePattern?: { year?: number; month: number; day: number } | null;

  @ApiPropertyOptional({
    description: 'Number of slots per game (must be even)',
  })
  @IsNumber()
  @Min(2)
  @IsOptional()
  slotsPerGame?: number;

  @ApiPropertyOptional({
    description: 'Reservation cost in coins (must be 0 for MVP)',
  })
  @IsNumber()
  @Min(0)
  @Max(0)
  @IsOptional()
  reservationCost?: number;

  @ApiPropertyOptional({
    description: 'Instant reservation cost in coins (must be 0 for MVP)',
  })
  @IsNumber()
  @Min(0)
  @Max(0)
  @IsOptional()
  instantReservationCost?: number | null;

  @ApiPropertyOptional({ description: 'Confirmation window in minutes' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  confirmationWindowMinutes?: number;

  @ApiPropertyOptional({ enum: RefundPolicy, description: 'Refund policy' })
  @IsEnum(RefundPolicy)
  @IsOptional()
  refundPolicy?: RefundPolicy;

  @ApiPropertyOptional({ description: 'Refund percentage (if PARTIAL)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  refundPercentage?: number | null;

  @ApiPropertyOptional({ description: 'Is exclusive to gold subscribers?' })
  @IsBoolean()
  @IsOptional()
  isExclusiveToGold?: boolean;

  @ApiPropertyOptional({ description: 'First game start time (HH:mm format)' })
  @IsString()
  @IsOptional()
  firstGameStartTime?: string;

  @ApiPropertyOptional({
    description: 'Whether reservations require confirmation',
  })
  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean;

  @ApiPropertyOptional({ description: 'Number of games per day' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  gamesPerDay?: number;

  @ApiPropertyOptional({ description: 'Team A name' })
  @IsString()
  @IsOptional()
  teamAName?: string;

  @ApiPropertyOptional({ description: 'Team B name' })
  @IsString()
  @IsOptional()
  teamBName?: string;

  @ApiPropertyOptional({ description: 'Reminder minutes before event' })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  reminderMinutesBefore?: number[] | null;

  @ApiPropertyOptional({
    description: 'Schedule start date (YYYY-MM-DD)',
  })
  @IsString()
  @IsOptional()
  scheduleStartDate?: string | null;

  @ApiPropertyOptional({
    description: 'Schedule end date (YYYY-MM-DD)',
  })
  @IsString()
  @IsOptional()
  scheduleEndDate?: string | null;

  @ApiPropertyOptional({ description: 'Is schedule active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [SlotConfigDto],
    description: 'Slot configurations',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotConfigDto)
  @IsOptional()
  slotConfigs?: SlotConfigDto[];

  @ApiPropertyOptional({
    description: 'Propagate changes now (cancel CREATED events and regenerate)',
  })
  @IsBoolean()
  @IsOptional()
  propagateNow?: boolean;

  @ApiPropertyOptional({
    description:
      'Force deactivate overlapping schedules instead of returning an error',
  })
  @IsBoolean()
  @IsOptional()
  forceDeactivateOverlapping?: boolean;
}
