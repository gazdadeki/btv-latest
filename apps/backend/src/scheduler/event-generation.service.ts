import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { GameGenerationService } from './game-generation.service';

/**
 * Service responsible for generating games from schedules.
 * Handles automatic game generation based on schedule recurrence patterns.
 */
@Injectable()
export class EventGenerationService {
  private lastRunTimestamp: Map<number, Date> = new Map();

  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @Inject(forwardRef(() => SchedulesService))
    private schedulesService: SchedulesService,
    private gameGenerationService: GameGenerationService,
  ) {}

  /**
   * Generate games for all active schedules that should run today.
   */
  async generateGames(): Promise<{
    schedulesProcessed: number;
    gamesCreated: number;
  }> {
    const activeSchedules = await this.scheduleRepository.find({
      where: { isActive: true },
      relations: ['slotConfigs'],
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let schedulesProcessed = 0;
    let gamesCreated = 0;

    for (const schedule of activeSchedules) {
      if (!this.schedulesService.shouldCreateGameToday(schedule)) {
        continue;
      }

      schedulesProcessed += 1;
      gamesCreated += await this.gameGenerationService.generateForSchedule(
        schedule,
        today,
      );
    }

    return { schedulesProcessed, gamesCreated };
  }

  /**
   * Generate games for a specific schedule on a specific date.
   * @param scheduleId - Schedule ID to generate games for
   * @param date - Target date for game generation
   * @returns Number of games created
   */
  async generateGamesForDate(
    scheduleId: number,
    date: Date,
    adminId?: number,
  ): Promise<number> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['slotConfigs'],
    });

    if (!schedule) {
      throw new BadRequestException(`Schedule ${scheduleId} not found`);
    }

    if (!schedule.isActive) {
      throw new BadRequestException(`Schedule ${scheduleId} is not active`);
    }

    const targetDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    return this.gameGenerationService.generateForSchedule(
      schedule,
      targetDate,
      adminId,
    );
  }
}
