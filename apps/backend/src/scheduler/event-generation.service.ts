import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Game, GameStatus } from '../games/entities/game.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { GameGenerationService } from './game-generation.service';
import { GameCancellationService } from '../games/game-cancellation.service';
import { StreamsService } from '../streams/streams.service';
import { utcStartOfDay, utcEndOfDay } from '../common/date.utils';
import { WebsocketService } from '../websocket/websocket.service';
import { WebsocketEvents } from '../websocket/events';

/** Returns the current UTC time as a zero-padded HH:MM string for comparison against time columns. */
function utcHHMM(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * Service responsible for generating games from schedules and opening them for reservations.
 */
@Injectable()
export class EventGenerationService {
  private readonly logger = new Logger(EventGenerationService.name);

  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @Inject(forwardRef(() => SchedulesService))
    private schedulesService: SchedulesService,
    private gameGenerationService: GameGenerationService,
    private gameCancellationService: GameCancellationService,
    private streamsService: StreamsService,
    private websocketService: WebsocketService,
  ) {}

  /**
   * Generate games for all active schedules whose gameCreationTime has arrived today.
   * Idempotent — the underlying bulk-write service prevents duplicate generation.
   */
  async generateGames(): Promise<{
    schedulesProcessed: number;
    gamesCreated: number;
  }> {
    // Auto-end stale streams from previous days and cancel their CREATED/OPEN games
    const staleEnded = await this.streamsService.autoEndStaleStreams();
    if (staleEnded > 0) {
      const cancelledCount =
        await this.gameCancellationService.cancelGamesForEndedStreams();
      if (cancelledCount > 0) {
        this.logger.log(
          `Cancelled ${cancelledCount} stale game(s) from auto-ended streams`,
        );
      }
    }

    const activeSchedules = await this.scheduleRepository.find({
      where: { isActive: true },
      relations: ['slotConfigs'],
    });

    const now = new Date();
    const currentTime = utcHHMM(now);
    const today = utcStartOfDay(now);
    let schedulesProcessed = 0;
    let gamesCreated = 0;

    for (const schedule of activeSchedules) {
      // Only generate once the schedule's designated creation time has passed.
      if (currentTime < schedule.gameCreationTime) {
        continue;
      }

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
   * Open CREATED games for reservation when their schedule's reservationOpenTime has arrived.
   * Schedules with reservationOpenTime = null create games as OPEN immediately (handled in bulk-write).
   */
  async openGamesForReservation(): Promise<number> {
    const now = new Date();
    const currentTime = utcHHMM(now);
    const todayStart = utcStartOfDay(now);
    const todayEnd = utcEndOfDay(now);

    // Find active schedules that have a reservationOpenTime and that time has passed.
    const schedules = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.isActive = :active', { active: true })
      .andWhere('schedule.reservationOpenTime IS NOT NULL')
      .andWhere('schedule.reservationOpenTime <= :currentTime', { currentTime })
      .getMany();

    if (schedules.length === 0) {
      return 0;
    }

    const scheduleIds = schedules.map((s) => s.id);

    // Find CREATED games for those schedules scheduled today.
    const gamesToOpen = await this.gameRepository
      .createQueryBuilder('game')
      .innerJoin('game.stream', 'stream')
      .where('stream.scheduleId IN (:...scheduleIds)', { scheduleIds })
      .andWhere('game.status = :status', { status: GameStatus.CREATED })
      .andWhere('game.scheduledStartTime BETWEEN :start AND :end', {
        start: todayStart,
        end: todayEnd,
      })
      .getMany();

    if (gamesToOpen.length === 0) {
      return 0;
    }

    const gameIds = gamesToOpen.map((g) => g.id);

    await this.gameRepository
      .createQueryBuilder()
      .update(Game)
      .set({ status: GameStatus.OPEN })
      .whereInIds(gameIds)
      .execute();

    for (const game of gamesToOpen) {
      this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
        gameId: game.id,
        status: GameStatus.OPEN,
      });
    }

    return gamesToOpen.length;
  }

  /**
   * Generate games for a specific schedule on a specific date (admin override).
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

    const targetDate = utcStartOfDay(date);
    return this.gameGenerationService.generateForSchedule(
      schedule,
      targetDate,
      adminId,
    );
  }
}
