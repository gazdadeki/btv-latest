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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceType, RefundPolicy } from '../entities/schedule.entity';
import { Team } from '../../games/entities/slot.entity';

export class SlotConfigDto {
  @ApiProperty({ description: 'Slot number (1-based)' })
  @IsNumber()
  slotNumber: number;

  @ApiProperty({ enum: Team, description: 'Team (A or B)' })
  @IsEnum(Team)
  team: Team;

  @ApiPropertyOptional({ description: 'Is this slot gold-only?' })
  @IsBoolean()
  @IsOptional()
  isGoldOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Coins cost override (null uses schedule default)',
  })
  @IsNumber()
  @IsOptional()
  coinsCost?: number | null;

  @ApiPropertyOptional({ description: 'Pre-assigned user ID' })
  @IsNumber()
  @IsOptional()
  preAssignedUserId?: number | null;
}

export class CreateScheduleDto {
  @ApiPropertyOptional({
    description: 'Schedule name (auto-generated if not provided)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Schedule description' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiProperty({ enum: RecurrenceType, description: 'Recurrence type' })
  @IsEnum(RecurrenceType)
  recurrenceType: RecurrenceType;

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

  @ApiProperty({ description: 'Number of slots per game (must be even)' })
  @IsNumber()
  @Min(2)
  slotsPerGame: number;

  @ApiProperty({ description: 'Reservation cost in coins' })
  @IsNumber()
  @Min(0)
  reservationCost: number;

  @ApiPropertyOptional({
    description:
      'Instant reservation cost in coins (if > 0, allows instant reserve and confirm in one step)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  instantReservationCost?: number | null;

  @ApiPropertyOptional({
    description:
      'Confirmation window in minutes (only applies when requiresConfirmation is true)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  confirmationWindowMinutes?: number;

  @ApiProperty({ enum: RefundPolicy, description: 'Refund policy' })
  @IsEnum(RefundPolicy)
  refundPolicy: RefundPolicy;

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

  @ApiProperty({ description: 'First game start time (HH:mm format)' })
  @IsString()
  firstGameStartTime: string;

  @ApiPropertyOptional({
    description: 'Whether reservations require confirmation (default false)',
  })
  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean;

  @ApiProperty({ description: 'Number of games per day', default: 1 })
  @IsNumber()
  @Min(1)
  gamesPerDay: number;

  @ApiPropertyOptional({ description: 'Team A name (default: Sentinel)' })
  @IsString()
  @IsOptional()
  teamAName?: string;

  @ApiPropertyOptional({ description: 'Team B name (default: Scourge)' })
  @IsString()
  @IsOptional()
  teamBName?: string;

  @ApiPropertyOptional({
    description: 'Pre-assigned users (legacy, use slotConfigs instead)',
  })
  @IsArray()
  @IsOptional()
  preAssignedUsers?: Array<{
    userId: number;
    slotNumber: number;
    team: 'A' | 'B';
  }> | null;

  @ApiPropertyOptional({ description: 'Reminder minutes before event' })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  reminderMinutesBefore?: number[] | null;

  @ApiPropertyOptional({ description: 'Is schedule active?', default: true })
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
    description:
      'Force deactivate overlapping schedules instead of returning an error',
  })
  @IsBoolean()
  @IsOptional()
  forceDeactivateOverlapping?: boolean;
}
