import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Game, GameStatus } from './entities/game.entity';
import { Slot, Team } from './entities/slot.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { AuditService } from '../audit/audit.service';
import { WebsocketService } from '../websocket/websocket.service';
import { SlotConfig } from '../schedules/entities/slot-config.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { SlotConfigService } from '../schedules/slot-config.service';
import { GameCancellationService } from './game-cancellation.service';
import { StatisticsService } from '../statistics/statistics.service';
import { CacheService } from '../cache/cache.service';
import { UpdateGameDto } from './dto/update-game.dto';
import { GameBatchService } from './game-batch.service';
import { GameNotificationService } from './game-notification.service';
import { SlotAdminAssignmentService } from './slot-admin-assignment.service';
import { GamesBatchChangedPayload, WebsocketEvents } from '../websocket/events';
import { shouldEmitPerGameEvents } from './bulk-game-event-mode';
import { StreamsService } from '../streams/streams.service';

/**
 * Service for managing games and their lifecycle.
 * Handles Game creation, status transitions, and slot management.
 *
 * Game lifecycle:
 * - CREATED: Game created, slots available for reservation
 * - IN_PROGRESS: Game started by admin
 * - FINISHED: Game completed with winning team
 * - CANCELLED: Game cancelled by admin
 *
 * All status changes are broadcast via WebSocket and logged in audit trail.
 */
@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Slot)
    private slotRepository: Repository<Slot>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private auditService: AuditService,
    private websocketService: WebsocketService,
    private schedulesService: SchedulesService,
    private slotConfigService: SlotConfigService,
    private statisticsService: StatisticsService,
    private cacheService: CacheService,
    private gameCancellationService: GameCancellationService,
    private gameBatchService: GameBatchService,
    private gameNotificationService: GameNotificationService,
    private slotAdminAssignmentService: SlotAdminAssignmentService,
    private streamsService: StreamsService,
  ) {}

  async create(
    data: Partial<Game> & { slotsPerGame: number; slotConfigs?: SlotConfig[] },
    options: { emitWebsocket?: boolean } = {},
  ): Promise<Game> {
    const game = this.gameRepository.create(data);
    const saved = await this.gameRepository.save(game);

    // Create slots based on slot configs if provided, otherwise use default distribution
    const slots: Slot[] = [];
    if (data.slotConfigs && data.slotConfigs.length > 0) {
      // Use slot configs
      for (const config of data.slotConfigs) {
        const hasPreAssignedUser = !!config.preAssignedUserId;
        slots.push(
          this.slotRepository.create({
            gameId: saved.id,
            slotNumber: config.slotNumber,
            team: config.team,
            isReserved: hasPreAssignedUser, // Mark as reserved if pre-assigned
            reservedByUserId: config.preAssignedUserId || null,
            isPreAssigned: hasPreAssignedUser,
            preAssignedUserId: config.preAssignedUserId || null,
          }),
        );
      }
    } else {
      // Default: equal distribution between teams
      const slotsPerTeam = data.slotsPerGame / 2;
      for (let i = 1; i <= data.slotsPerGame; i++) {
        slots.push(
          this.slotRepository.create({
            gameId: saved.id,
            slotNumber: i,
            team: i <= slotsPerTeam ? Team.A : Team.B,
            isReserved: false,
          }),
        );
      }
    }
    await this.slotRepository.save(slots);

    const shouldEmitWebsocket = options.emitWebsocket !== false;
    if (shouldEmitWebsocket) {
      await this.websocketService.broadcast(WebsocketEvents.GameCreated, saved);
    }

    return saved;
  }

  async createManually(
    data: {
      scheduleId?: number;
      scheduledStartTime: string;
      teamAName?: string;
      teamBName?: string;
      isExclusiveToGold?: boolean;
    },
    adminId: number,
  ): Promise<Game> {
    // Resolve schedule: use provided scheduleId or derive from active stream
    let resolvedScheduleId = data.scheduleId;
    let activeStreamId: number | null = null;

    const activeStream = await this.streamsService.findActiveStream();
    if (activeStream) {
      if (!resolvedScheduleId) {
        resolvedScheduleId = activeStream.scheduleId;
        activeStreamId = activeStream.id;
      } else if (resolvedScheduleId === activeStream.scheduleId) {
        activeStreamId = activeStream.id;
      }
      // If scheduleId doesn't match stream's schedule, don't attach to stream
    }

    if (!resolvedScheduleId) {
      throw new BadRequestException(
        'No active stream. Cannot create game without a schedule.',
      );
    }

    const schedule = await this.schedulesService.findOne(resolvedScheduleId);

    const scheduledStartTime = new Date(data.scheduledStartTime);
    if (isNaN(scheduledStartTime.getTime())) {
      throw new BadRequestException('Invalid scheduledStartTime format');
    }

    // Get slot configs from schedule
    const slotConfigs =
      schedule.slotConfigs ||
      (await this.slotConfigService.findBySchedule(schedule.id));

    // Generate a new batch ID for manually created games
    const generationBatchId = randomUUID();

    const game = await this.create({
      scheduleId: schedule.id,
      status: GameStatus.CREATED,
      scheduledStartTime,
      teamAName: data.teamAName || schedule.teamAName,
      teamBName: data.teamBName || schedule.teamBName,
      isExclusiveToGold:
        data.isExclusiveToGold !== undefined
          ? data.isExclusiveToGold
          : schedule.isExclusiveToGold,
      slotsPerGame: schedule.slotsPerGame,
      slotConfigs: slotConfigs,
      generationBatchId,
      gameIndex: 1,
      streamId: activeStreamId,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_CREATED_MANUALLY',
      entityType: 'Game',
      entityId: game.id.toString(),
      details: {
        scheduleId: schedule.id,
        scheduledStartTime: data.scheduledStartTime,
        generationBatchId,
        gameIndex: 1,
        streamId: activeStreamId,
      },
    });

    return game;
  }

  async findAll(filters?: {
    status?: GameStatus;
    scheduleId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Game[]> {
    const query = this.gameRepository.createQueryBuilder('game');
    if (filters?.status) {
      query.andWhere('game.status = :status', { status: filters.status });
    }
    if (filters?.scheduleId) {
      query.andWhere('game.scheduleId = :scheduleId', {
        scheduleId: filters.scheduleId,
      });
    }
    if (filters?.startDate) {
      query.andWhere('game.scheduledStartTime >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters?.endDate) {
      query.andWhere('game.scheduledStartTime <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Order by ID descending
    return query
      .leftJoinAndSelect('game.schedule', 'schedule')
      .leftJoinAndSelect('game.slots', 'slots')
      .orderBy('game.id', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id },
      relations: ['schedule', 'slots', 'reservations', 'reservations.user'],
    });
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    return game;
  }

  /**
   * Get total number of games in a generation batch.
   * @param generationBatchId - The batch UUID to count games for
   * @returns Total number of games in the batch
   */
  async getTotalGamesInBatch(generationBatchId: string): Promise<number> {
    return this.gameBatchService.getTotalGamesInBatch(generationBatchId);
  }

  /**
   * Get the next game in the same batch (by gameIndex).
   * @param game - Current game
   * @returns Next game in the batch, or null if no next game
   */
  async getNextGameInBatch(game: Game): Promise<Game | null> {
    return this.gameBatchService.getNextGameInBatch(game);
  }

  async start(id: number, adminId: number): Promise<Game> {
    const game = await this.findOne(id);
    if (game.status !== GameStatus.CREATED) {
      throw new BadRequestException('Game cannot be started');
    }

    // Check if another game is IN_PROGRESS for same schedule/day
    const gameDate = new Date(game.scheduledStartTime);
    gameDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(gameDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const inProgressGame = await this.gameRepository.findOne({
      where: {
        scheduleId: game.scheduleId,
        status: GameStatus.IN_PROGRESS,
      },
    });

    if (inProgressGame && inProgressGame.id !== id) {
      const inProgressDate = new Date(inProgressGame.scheduledStartTime);
      inProgressDate.setUTCHours(0, 0, 0, 0);
      if (inProgressDate.getTime() === gameDate.getTime()) {
        throw new BadRequestException(
          'Another game is already in progress for this schedule/day. Only one game can be in progress at a time.',
        );
      }
    }

    game.status = GameStatus.IN_PROGRESS;
    game.actualStartTime = new Date();
    const updated = await this.gameRepository.save(game);

    // Determine game position for the schedule day
    const position = await this.getGamePositionInScheduleDay(
      id,
      game.scheduleId,
      gameDate,
    );

    // Get game URL (use game URL if set, otherwise fall back to schedule URL)
    const gameUrl = updated.url || updated.stream?.url || 'https://youtube.com';

    await this.gameNotificationService.publishGameStarted(
      updated,
      position,
      gameUrl,
    );

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_STARTED',
      entityType: 'Game',
      entityId: id.toString(),
    });

    return updated;
  }

  private async isFirstGameForScheduleDay(
    gameId: number,
    scheduleId: number,
    date: Date,
  ): Promise<boolean> {
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const earlierGames = await this.gameRepository.find({
      where: {
        scheduleId,
        status: GameStatus.IN_PROGRESS,
      },
    });

    // Check if any earlier Game for the same day has been started
    for (const earlierGame of earlierGames) {
      if (earlierGame.id === gameId) continue;
      const earlierDate = new Date(earlierGame.scheduledStartTime);
      earlierDate.setUTCHours(0, 0, 0, 0);
      if (
        earlierDate.getTime() === date.getTime() &&
        earlierGame.actualStartTime
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a game is the last game for the schedule day.
   * @param gameId - The game ID to check
   * @param scheduleId - The schedule ID
   * @param date - The date to check (normalized to start of day)
   * @returns True if this is the last game for the schedule day
   */
  private async isLastGameForScheduleDay(
    gameId: number,
    scheduleId: number,
    date: Date,
  ): Promise<boolean> {
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Find all CREATED games for the same schedule/day that come after this game
    const laterGames = await this.gameRepository.find({
      where: {
        scheduleId,
        status: GameStatus.CREATED,
      },
      order: {
        scheduledStartTime: 'ASC',
      },
    });

    // Check if any later game exists for the same day
    for (const laterGame of laterGames) {
      if (laterGame.id === gameId) continue;
      const laterDate = new Date(laterGame.scheduledStartTime);
      laterDate.setUTCHours(0, 0, 0, 0);
      if (
        laterDate.getTime() === date.getTime() &&
        laterGame.scheduledStartTime > new Date()
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines the position of a game within the schedule day (first, other, or last).
   * @param gameId - The game ID to check
   * @param scheduleId - The schedule ID
   * @param date - The date to check (normalized to start of day)
   * @returns 'first', 'last', or 'other'
   */
  private async getGamePositionInScheduleDay(
    gameId: number,
    scheduleId: number,
    date: Date,
  ): Promise<'first' | 'last' | 'other'> {
    const isFirst = await this.isFirstGameForScheduleDay(
      gameId,
      scheduleId,
      date,
    );
    const isLast = await this.isLastGameForScheduleDay(
      gameId,
      scheduleId,
      date,
    );

    if (isFirst && isLast) {
      // Only one game for the day - consider it both first and last, but we'll treat it as 'first' for start and 'last' for finish
      return 'first'; // For start events, treat as first
    }

    if (isFirst) {
      return 'first';
    }

    if (isLast) {
      return 'last';
    }

    return 'other';
  }

  async finish(
    id: number,
    adminId: number,
    data: { winningTeam: 'A' | 'B'; mvpUserId?: number },
  ): Promise<{ game: Game; nextGame?: Game; isLastGame: boolean }> {
    const game = await this.findOne(id);
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress');
    }

    game.status = GameStatus.FINISHED;
    game.actualEndTime = new Date();
    game.winningTeam = data.winningTeam;
    game.mvpUserId = data.mvpUserId;

    // Calculate duration from actual start and end times
    if (game.actualStartTime && game.actualEndTime) {
      const durationMs =
        game.actualEndTime.getTime() - game.actualStartTime.getTime();
      game.durationMinutes = Math.round(durationMs / (1000 * 60));
    }

    const updated = await this.gameRepository.save(game);

    // Update statistics for all participants
    await this.updateStatisticsForGame(updated);

    // Check if there's a next game for the same schedule/day
    const gameDate = new Date(game.scheduledStartTime);
    gameDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(gameDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const nextGame = await this.gameRepository.findOne({
      where: {
        scheduleId: game.scheduleId,
        status: GameStatus.CREATED,
      },
      order: {
        scheduledStartTime: 'ASC',
      },
    });

    let isLastGame = true;
    if (nextGame) {
      const nextGameDate = new Date(nextGame.scheduledStartTime);
      nextGameDate.setUTCHours(0, 0, 0, 0);
      if (nextGameDate.getTime() === gameDate.getTime()) {
        isLastGame = false;
      }
    }

    // Determine game position for finish events
    // Check if this is the first game finished for the day
    const finishedGamesForDay = await this.gameRepository.find({
      where: {
        scheduleId: game.scheduleId,
        status: GameStatus.FINISHED,
      },
    });

    const isFirstFinished =
      finishedGamesForDay.filter((g) => {
        const gDate = new Date(g.scheduledStartTime);
        gDate.setUTCHours(0, 0, 0, 0);
        return gDate.getTime() === gameDate.getTime() && g.id !== id;
      }).length === 0;

    // Determine position: first finished, last game, or other
    let finishPosition: 'first' | 'last' | 'other';
    if (isFirstFinished && isLastGame) {
      // Only one game for the day - treat as both first and last, but for finish we'll use 'last'
      finishPosition = 'last';
    } else if (isFirstFinished) {
      finishPosition = 'first';
    } else if (isLastGame) {
      finishPosition = 'last';
    } else {
      finishPosition = 'other';
    }

    // Get game URL (use game URL if set, otherwise fall back to schedule URL)
    const gameUrl = updated.url || updated.stream?.url || 'https://youtube.com';
    const winningTeamName =
      updated.winningTeam === 'A' ? updated.teamAName : updated.teamBName;

    await this.gameNotificationService.publishGameFinished(
      updated,
      finishPosition,
      gameUrl,
      winningTeamName,
      isLastGame,
    );

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_FINISHED',
      entityType: 'Game',
      entityId: id.toString(),
      details: { winningTeam: data.winningTeam, mvpUserId: data.mvpUserId },
    });

    return {
      game: updated,
      nextGame: !isLastGame ? nextGame : undefined,
      isLastGame,
    };
  }

  /**
   * Updates statistics for all participants in a finished game.
   * Only processes CONFIRMED reservations with valid slots and winning team.
   * Statistics are updated atomically per user.
   * Creates statistics record if it doesn't exist for a user.
   *
   * @param game - The finished game with winningTeam set
   */
  private async updateStatisticsForGame(game: Game): Promise<void> {
    // Ensure game has a winning team before processing statistics
    if (!game.winningTeam) {
      return;
    }

    const reservations = await this.reservationRepository.find({
      where: {
        gameId: game.id,
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['slot', 'user'],
    });

    // Process each reservation and update statistics
    for (const reservation of reservations) {
      // Skip if reservation doesn't have a slot or user
      if (!reservation.slot || !reservation.user || !reservation.userId) {
        continue;
      }

      // Skip if slot doesn't have a team assigned
      if (!reservation.slot.team) {
        continue;
      }

      const userTeam = reservation.slot.team;
      const isWinner = userTeam === game.winningTeam;

      try {
        // Ensure statistics exist for this user before updating
        let userStats = await this.statisticsService.findByUserId(
          reservation.userId,
        );
        if (!userStats) {
          userStats = await this.statisticsService.createStatistics(
            reservation.userId,
          );
        }

        if (isWinner) {
          await this.statisticsService.incrementWins(reservation.userId);
        } else {
          await this.statisticsService.incrementLosses(reservation.userId);
        }

        // Invalidate user cache so updated statistics are reflected
        this.cacheService.del(this.cacheService.getUserKey(reservation.userId));
      } catch (error) {
        // Log error but continue processing other reservations
        console.error(
          `Failed to update statistics for user ${reservation.userId} in game ${game.id}:`,
          error,
        );
      }
    }
  }

  async cancel(id: number, adminId: number): Promise<Game> {
    const game = await this.findOne(id);

    // Allow cancelling CREATED and IN_PROGRESS games
    if (
      game.status !== GameStatus.CREATED &&
      game.status !== GameStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Only CREATED or IN_PROGRESS games can be cancelled',
      );
    }

    game.status = GameStatus.CANCELLED;
    const updated = await this.gameRepository.save(game);

    await this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
      gameId: id,
      status: GameStatus.CANCELLED,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_CANCELLED',
      entityType: 'Game',
      entityId: id.toString(),
    });

    return updated;
  }

  /**
   * Cancel all active games (CREATED and IN_PROGRESS status).
   *
   * @param adminId - Admin user ID performing the action
   * @returns Object with count of cancelled games
   */
  async cancelAllActiveGames(
    adminId: number,
  ): Promise<{ cancelledCount: number }> {
    const activeGameRows = await this.gameRepository
      .createQueryBuilder('game')
      .select('game.id', 'id')
      .where('game.status IN (:...statuses)', {
        statuses: [GameStatus.CREATED, GameStatus.IN_PROGRESS],
      })
      .getRawMany();
    const activeGameIds = activeGameRows.map((row) => Number(row.id));

    if (activeGameIds.length === 0) {
      return { cancelledCount: 0 };
    }

    const reservationRows = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('DISTINCT reservation.gameId', 'gameId')
      .where('reservation.gameId IN (:...gameIds)', {
        gameIds: activeGameIds,
      })
      .getRawMany();
    const gameIdsWithReservations = new Set(
      reservationRows.map((row) => Number(row.gameId)),
    );
    const gameIdsWithoutReservations = activeGameIds.filter(
      (id) => !gameIdsWithReservations.has(id),
    );

    const correlationId = randomUUID();
    const emitPerGameEvents = shouldEmitPerGameEvents();
    let cancelledCount = 0;

    if (gameIdsWithoutReservations.length > 0) {
      await this.gameRepository
        .createQueryBuilder()
        .update(Game)
        .set({ status: GameStatus.CANCELLED, updatedAt: new Date() })
        .whereInIds(gameIdsWithoutReservations)
        .execute();

      cancelledCount += gameIdsWithoutReservations.length;

      if (emitPerGameEvents) {
        for (const gameId of gameIdsWithoutReservations) {
          this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
            gameId,
            status: GameStatus.CANCELLED,
          });
        }
      }

      for (const gameId of gameIdsWithoutReservations) {
        await this.auditService.log({
          userId: adminId,
          action: 'GAME_CANCELLED',
          entityType: 'Game',
          entityId: gameId.toString(),
          details: { reason: 'Bulk cancel all active games' },
        });
      }
    }

    if (gameIdsWithReservations.size > 0) {
      cancelledCount += await this.gameCancellationService.cancelGamesByIds(
        Array.from(gameIdsWithReservations),
        {
          statuses: [GameStatus.CREATED, GameStatus.IN_PROGRESS],
          adminId,
          audit: true,
          emitWebsocket: emitPerGameEvents,
          reason: 'Bulk cancel all active games',
        },
      );
    }

    if (cancelledCount > 0) {
      const payload: GamesBatchChangedPayload = {
        action: 'cancelled',
        counts: { created: 0, cancelled: cancelledCount, updated: 0 },
        affectedGameIds: activeGameIds.length <= 50 ? activeGameIds : undefined,
      };
      this.websocketService.broadcastEnvelope(
        WebsocketEvents.GamesBatchChanged,
        payload,
        correlationId,
      );

      await this.auditService.log({
        userId: adminId,
        action: 'GAMES_BATCH_CANCELLED',
        entityType: 'GameBatch',
        entityId: null,
        details: {
          counts: payload.counts,
          correlationId,
        },
      });
    }

    return { cancelledCount };
  }

  /**
   * Updates game details. Most fields can only be edited for CREATED games.
   * URL can be updated for any game status to preserve existing functionality.
   * @param id - Game ID
   * @param data - Game update data
   * @param adminId - Admin user ID
   * @returns Updated game
   */
  async updateGame(
    id: number,
    data: UpdateGameDto,
    adminId: number,
  ): Promise<Game> {
    const game = await this.findOne(id);

    // Check if we're trying to update fields other than URL
    const hasNonUrlUpdates =
      data.teamAName !== undefined ||
      data.teamBName !== undefined ||
      data.isExclusiveToGold !== undefined ||
      data.scheduledStartTime !== undefined;

    // Only allow non-URL updates for CREATED games
    if (hasNonUrlUpdates && game.status !== GameStatus.CREATED) {
      throw new BadRequestException(
        'Game details can only be edited when status is CREATED',
      );
    }

    if (data.teamAName) game.teamAName = data.teamAName;
    if (data.teamBName) game.teamBName = data.teamBName;
    if (data.isExclusiveToGold !== undefined)
      game.isExclusiveToGold = data.isExclusiveToGold;
    if (data.url !== undefined) game.url = data.url;
    if (data.scheduledStartTime) {
      const scheduledStartTime = new Date(data.scheduledStartTime);
      if (isNaN(scheduledStartTime.getTime())) {
        throw new BadRequestException('Invalid scheduledStartTime format');
      }
      game.scheduledStartTime = scheduledStartTime;
    }

    const updated = await this.gameRepository.save(game);

    await this.websocketService.broadcast(WebsocketEvents.GameUpdated, {
      gameId: id,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_UPDATED',
      entityType: 'Game',
      entityId: id.toString(),
      details: data,
    });

    return updated;
  }

  async assignUserToSlot(
    gameId: number,
    slotId: number,
    userId: number,
    adminId: number,
  ): Promise<Slot> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.assignUserToSlot(
      game,
      slotId,
      userId,
      adminId,
    );
  }

  async kickUserFromSlot(
    gameId: number,
    slotId: number,
    adminId: number,
  ): Promise<Slot> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.kickUserFromSlot(
      game,
      slotId,
      adminId,
    );
  }

  /**
   * Admin confirms a reservation for a slot in a game.
   * Bypasses confirmation window and cost checks.
   * Can only be used for games that are not finished or cancelled.
   *
   * @param gameId - Game ID
   * @param slotId - Slot ID to confirm reservation for
   * @param adminId - Admin user ID performing the action
   * @returns Updated reservation
   */
  async confirmSlotReservation(
    gameId: number,
    slotId: number,
    adminId: number,
  ): Promise<Reservation> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.confirmSlotReservation(
      game,
      slotId,
      adminId,
    );
  }

  /**
   * Admin confirms all reserved slots in a game.
   * Bypasses confirmation window and cost checks for all reservations.
   * Can only be used for games that are not finished or cancelled.
   *
   * @param gameId - Game ID
   * @param adminId - Admin user ID performing the action
   * @returns Object with confirmedCount
   */
  async confirmAllSlotReservations(
    gameId: number,
    adminId: number,
  ): Promise<{ confirmedCount: number }> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.confirmAllSlotReservations(
      game,
      adminId,
    );
  }

  /**
   * Admin cancels all confirmed reservations in a game.
   * Can only be used for games that are not finished or cancelled.
   *
   * @param gameId - Game ID
   * @param adminId - Admin user ID performing the action
   * @returns Object with cancelledCount
   */
  async cancelAllConfirmations(
    gameId: number,
    adminId: number,
  ): Promise<{ cancelledCount: number }> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.cancelAllConfirmations(
      game,
      adminId,
    );
  }

  async autoStartNextGame(
    gameId: number,
    delayMinutes: number,
    adminId: number,
  ): Promise<{ success: boolean; nextGameId?: number }> {
    const game = await this.findOne(gameId);

    const gameDate = new Date(game.scheduledStartTime);
    gameDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(gameDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const nextGame = await this.gameRepository.findOne({
      where: {
        scheduleId: game.scheduleId,
        status: GameStatus.CREATED,
      },
      order: {
        scheduledStartTime: 'ASC',
      },
    });

    if (!nextGame) {
      throw new BadRequestException('No next game found');
    }

    const nextGameDate = new Date(nextGame.scheduledStartTime);
    nextGameDate.setUTCHours(0, 0, 0, 0);
    if (nextGameDate.getTime() !== gameDate.getTime()) {
      throw new BadRequestException('Next game is not for the same day');
    }

    // Schedule auto-start
    setTimeout(
      async () => {
        try {
          await this.start(nextGame.id, adminId);
        } catch (error) {
          console.error('Failed to auto-start next game:', error);
        }
      },
      delayMinutes * 60 * 1000,
    );

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_AUTO_START_SCHEDULED',
      entityType: 'Game',
      entityId: nextGame.id.toString(),
      details: { currentGameId: gameId, delayMinutes },
    });

    return { success: true, nextGameId: nextGame.id };
  }

  /**
   * Shuffles players in an Game by randomly reassigning non-admin, non-gold-slot users.
   * Keeps admin users and users in gold-only slots in their current positions.
   * Ensures all shuffleable users are reassigned to available slots - no users are removed.
   *
   * @param gameId - Game ID to shuffle players for
   * @param adminId - Admin user ID performing the shuffle
   * @returns Object with count of shuffled users and success message
   */
  async shufflePlayers(
    gameId: number,
    adminId: number,
  ): Promise<{ shuffled: number; message: string }> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.shufflePlayers(game, adminId);
  }
}
