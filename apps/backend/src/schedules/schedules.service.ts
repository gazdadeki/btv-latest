import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Schedule, RecurrenceType } from './entities/schedule.entity';
import { Stream, StreamStatus } from '../streams/entities/stream.entity';
import { AuditService } from '../audit/audit.service';
import { SlotConfigService } from './slot-config.service';
import { SlotConfig } from './entities/slot-config.entity';
import { Team, TEAM_NAMES } from '../games/entities/slot.entity';
import { GameCancellationService } from '../games/game-cancellation.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { utcStartOfDay } from '../common/date.utils';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Stream)
    private streamRepository: Repository<Stream>,
    private auditService: AuditService,
    private slotConfigService: SlotConfigService,
    private gameCancellationService: GameCancellationService,
  ) {}

  private static readonly SLOTS_PER_GAME = 10;

  async create(data: CreateScheduleDto, createdBy: number): Promise<Schedule> {
    const { slotConfigs, forceDeactivateOverlapping, ...scheduleData } = data;

    // Always enforce hardcoded slots per game
    scheduleData.slotsPerGame = SchedulesService.SLOTS_PER_GAME;

    // Auto-generate name if not provided
    if (!scheduleData.name || scheduleData.name.trim() === '') {
      const scheduleCount = await this.scheduleRepository.count();
      scheduleData.name = `Schedule ${scheduleCount + 1}`;
    }

    // Default team names
    if (!scheduleData.teamAName) scheduleData.teamAName = TEAM_NAMES[Team.A];
    if (!scheduleData.teamBName) scheduleData.teamBName = TEAM_NAMES[Team.B];

    // Validate start/end dates
    if (
      scheduleData.scheduleStartDate &&
      scheduleData.scheduleEndDate &&
      scheduleData.scheduleStartDate > scheduleData.scheduleEndDate
    ) {
      throw new BadRequestException(
        'Schedule start date cannot be after end date',
      );
    }

    // Check for overlapping active schedules
    await this.handleOverlap(
      scheduleData.scheduleStartDate,
      scheduleData.scheduleEndDate,
      !!forceDeactivateOverlapping,
    );

    const schedule = this.scheduleRepository.create({
      ...scheduleData,
      createdBy,
    });

    const saved = await this.scheduleRepository.save(schedule);

    // Create default slot configs if not provided
    let configsToCreate: Partial<SlotConfig>[];
    if (slotConfigs && slotConfigs.length > 0) {
      await this.slotConfigService.validateSlotConfigs(slotConfigs);
      configsToCreate = slotConfigs.map((config) => ({
        ...config,
        scheduleId: saved.id,
      }));
    } else {
      // Default: 10 slots (5 per team)
      configsToCreate = this.createDefaultSlotConfigs(
        saved.id,
        saved.slotsPerGame,
        createdBy,
      );
    }

    // Always pre-assign slot 1 to the schedule creator (admin)
    const slot1 = configsToCreate.find((c) => c.slotNumber === 1);
    if (slot1 && !slot1.preAssignedUserId) {
      slot1.preAssignedUserId = createdBy;
    }

    await this.slotConfigService.createMany(configsToCreate);

    await this.auditService.log({
      userId: createdBy,
      action: 'SCHEDULE_CREATED',
      entityType: 'Schedule',
      entityId: saved.id.toString(),
      details: { scheduleName: saved.name },
    });

    return saved;
  }

  private createDefaultSlotConfigs(
    scheduleId: number,
    slotsPerGame: number,
    createdBy: number,
  ): Partial<SlotConfig>[] {
    const slotsPerTeam = slotsPerGame / 2;
    const configs: Partial<SlotConfig>[] = [];

    // Team A slots
    for (let i = 1; i <= slotsPerTeam; i++) {
      configs.push({
        scheduleId,
        slotNumber: i,
        team: Team.A,
        isGoldOnly: i === 2 || i === 3, // Slots 2-3 are gold-only by default
        coinsCost: null,
        preAssignedUserId: i === 1 ? createdBy : null, // Slot 1 pre-assigned to creator
      });
    }

    // Team B slots
    for (let i = 1; i <= slotsPerTeam; i++) {
      configs.push({
        scheduleId,
        slotNumber: slotsPerTeam + i,
        team: Team.B,
        isGoldOnly: false,
        coinsCost: null,
        preAssignedUserId: null,
      });
    }

    return configs;
  }

  async findAll(): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: { deletedAt: null },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, deletedAt: null },
      relations: [
        'createdByUser',
        'games',
        'slotConfigs',
        'slotConfigs.preAssignedUser',
      ],
    });
    if (!schedule) {
      throw new BadRequestException('Schedule not found');
    }
    return schedule;
  }

  async update(
    id: number,
    data: UpdateScheduleDto,
    updatedBy: number,
  ): Promise<Schedule> {
    const {
      slotConfigs,
      propagateNow,
      forceDeactivateOverlapping,
      ...scheduleData
    } = data;

    // Prevent client from changing slotsPerGame
    delete (scheduleData as any).slotsPerGame;
    const schedule = await this.findOne(id);

    // Check for overlapping active schedules if dates are being changed
    if (
      scheduleData.scheduleStartDate !== undefined ||
      scheduleData.scheduleEndDate !== undefined
    ) {
      const effectiveStart =
        scheduleData.scheduleStartDate ?? schedule.scheduleStartDate;
      const effectiveEnd =
        scheduleData.scheduleEndDate ?? schedule.scheduleEndDate;

      if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
        throw new BadRequestException(
          'Schedule start date cannot be after end date',
        );
      }

      await this.handleOverlap(
        effectiveStart,
        effectiveEnd,
        !!forceDeactivateOverlapping,
        id,
      );
    }

    Object.assign(schedule, scheduleData);
    await this.scheduleRepository.save(schedule);

    // Update slot configs if provided
    if (slotConfigs) {
      await this.slotConfigService.validateSlotConfigs(slotConfigs);
      await this.slotConfigService.update(
        id,
        slotConfigs.map((config) => ({
          ...config,
          scheduleId: id,
        })),
      );
    }

    // If propagateNow is true, cancel all CREATED events and regenerate
    if (propagateNow) {
      await this.cancelScheduleGames(id, updatedBy);
    }

    await this.auditService.log({
      userId: updatedBy,
      action: 'SCHEDULE_UPDATED',
      entityType: 'Schedule',
      entityId: id.toString(),
      details: { propagateNow: propagateNow || false },
    });

    return this.findOne(id);
  }

  /**
   * Activate a schedule. Multiple schedules can be active if their
   * date ranges don't overlap (enforced by validateNoOverlap on create/update).
   */
  async activate(id: number, adminId: number): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, deletedAt: null },
    });
    if (!schedule) {
      throw new BadRequestException('Schedule not found');
    }

    await this.scheduleRepository.update({ id }, { isActive: true });

    await this.auditService.log({
      userId: adminId,
      action: 'SCHEDULE_ACTIVATED',
      entityType: 'Schedule',
      entityId: id.toString(),
      details: { scheduleName: schedule.name },
    });

    return this.findOne(id);
  }

  async cancelScheduleGames(
    scheduleId: number,
    adminId: number,
  ): Promise<number> {
    return this.gameCancellationService.cancelCreatedGamesForSchedule(
      scheduleId,
      {
        adminId,
        audit: true,
        emitWebsocket: false,
        reason: 'Schedule updated with propagateNow=true',
      },
    );
  }

  /**
   * Soft delete a schedule
   *
   * Marks the schedule as deleted using deletedAt and deletedBy flags instead of physically removing it.
   *
   * @param id - Schedule ID to delete
   * @param deletedBy - User ID performing the deletion
   * @returns Object with success message and schedule details
   * @throws BadRequestException if schedule not found or already deleted
   */
  async remove(
    id: number,
    deletedBy: number,
  ): Promise<{ message: string; scheduleId: number; scheduleName: string }> {
    // Check if schedule exists and is not already deleted
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new BadRequestException('Schedule not found');
    }

    if (schedule.deletedAt !== null) {
      throw new BadRequestException('Schedule is already deleted');
    }

    // Prevent deletion while a stream is running for this schedule
    const activeStream = await this.streamRepository.findOne({
      where: {
        scheduleId: id,
        status: Not(StreamStatus.ENDED),
      },
    });
    if (activeStream) {
      throw new BadRequestException(
        'Cannot delete schedule while a stream is running. Please end the stream first.',
      );
    }

    // Soft delete: mark as deleted instead of removing physically
    schedule.deletedAt = new Date();
    schedule.deletedBy = deletedBy;
    schedule.isActive = false; // Also deactivate the schedule
    await this.scheduleRepository.save(schedule);

    await this.auditService.log({
      userId: deletedBy,
      action: 'SCHEDULE_DELETED',
      entityType: 'Schedule',
      entityId: id.toString(),
      details: { scheduleName: schedule.name, softDelete: true },
    });

    return {
      message: 'Schedule deleted successfully',
      scheduleId: id,
      scheduleName: schedule.name,
    };
  }

  /**
   * Find active schedules whose date ranges overlap with the given range.
   */
  private async findOverlappingSchedules(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    excludeId?: number,
  ): Promise<Schedule[]> {
    const query = this.scheduleRepository
      .createQueryBuilder('s')
      .where('s.deletedAt IS NULL')
      .andWhere('s.isActive = :active', { active: true });

    if (excludeId) {
      query.andWhere('s.id != :excludeId', { excludeId });
    }

    const existing = await query.getMany();
    const newStart = startDate || null;
    const newEnd = endDate || null;

    return existing.filter((s) => {
      const existingStart = s.scheduleStartDate || null;
      const existingEnd = s.scheduleEndDate || null;

      // Two ranges overlap unless one ends before the other starts
      const noOverlap =
        (newEnd && existingStart && newEnd < existingStart) ||
        (existingEnd && newStart && existingEnd < newStart);

      return !noOverlap;
    });
  }

  /**
   * Validate no overlap, or deactivate overlapping schedules if forced.
   */
  private async handleOverlap(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    forceDeactivate: boolean,
    excludeId?: number,
  ): Promise<void> {
    const overlapping = await this.findOverlappingSchedules(
      startDate,
      endDate,
      excludeId,
    );

    if (overlapping.length === 0) return;

    if (!forceDeactivate) {
      const names = overlapping
        .map((s) => `"${s.name}" (ID: ${s.id})`)
        .join(', ');
      throw new BadRequestException(
        `Date range overlaps with active schedule(s): ${names}. Set forceDeactivateOverlapping to proceed.`,
      );
    }

    // Deactivate overlapping schedules
    const ids = overlapping.map((s) => s.id);
    await this.scheduleRepository
      .createQueryBuilder()
      .update(Schedule)
      .set({ isActive: false })
      .whereInIds(ids)
      .execute();
  }

  shouldCreateGameToday(schedule: Schedule): boolean {
    return this.shouldCreateGameOnDate(schedule, new Date());
  }

  shouldCreateGameOnDate(schedule: Schedule, date: Date): boolean {
    // Enforce optional schedule date window (dates stored as 'YYYY-MM-DD' UTC).
    // Compare date-only (start of day) to avoid time-of-day affecting boundary checks.
    const dateOnly = utcStartOfDay(date);
    if (schedule.scheduleStartDate) {
      const start = new Date(schedule.scheduleStartDate + 'T00:00:00Z');
      if (dateOnly < start) return false;
    }
    if (schedule.scheduleEndDate) {
      const end = new Date(schedule.scheduleEndDate + 'T00:00:00Z');
      if (dateOnly > end) return false;
    }

    const dayOfWeek = date.getUTCDay();
    const dayOfMonth = date.getUTCDate();

    switch (schedule.recurrenceType) {
      case RecurrenceType.WEEKLY:
        return schedule.recurrenceDays?.includes(dayOfWeek) || false;
      case RecurrenceType.MONTHLY:
        return schedule.recurrenceDays?.includes(dayOfMonth) || false;
      case RecurrenceType.YEARLY:
        if (schedule.recurrencePattern) {
          return (
            date.getUTCMonth() + 1 === schedule.recurrencePattern.month &&
            date.getUTCDate() === schedule.recurrencePattern.day
          );
        }
        return false;
      case RecurrenceType.ONCE:
        if (schedule.recurrencePattern) {
          const { year, month, day } = schedule.recurrencePattern;
          const yearMatch = !year || date.getUTCFullYear() === year;
          return (
            yearMatch &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day
          );
        }
        return false;
      default:
        return false;
    }
  }
}
