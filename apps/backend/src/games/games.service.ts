import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import type { Paginated } from '@btv/types';
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
import { SlotAdminAssignmentService } from './slot-admin-assignment.service';
import { GamesBatchChangedPayload, WebsocketEvents } from '../websocket/events';
import { shouldEmitPerGameEvents } from './bulk-game-event-mode';
import { StreamsService } from '../streams/streams.service';
import { buildZeroCostReservation } from '../common/reservation.utils';
import { utcStartOfDay } from '../common/date.utils';

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
    private slotAdminAssignmentService: SlotAdminAssignmentService,
    private streamsService: StreamsService,
    private dataSource: DataSource,
  ) {}

  async create(
    data: Partial<Game> & { slotsPerGame: number; slotConfigs?: SlotConfig[] },
    options: { emitWebsocket?: boolean } = {},
  ): Promise<Game> {
    const game = this.gameRepository.create(data);
    const saved = await this.gameRepository.save(game);

    // Create slots based on slot configs if provided, otherwise use default distribution
    const forceNoGold = !!saved.allowMultipleReservations;
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
            isGoldOnly: forceNoGold ? false : (config.isGoldOnly ?? false),
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
    const savedSlots = await this.slotRepository.save(slots);

    // Create confirmed reservations (zero cost) for pre-assigned users
    const preAssignedSlots = savedSlots.filter(
      (s) => s.isPreAssigned && s.preAssignedUserId,
    );
    if (preAssignedSlots.length > 0) {
      const reservations = preAssignedSlots.map((s) =>
        this.reservationRepository.create(
          buildZeroCostReservation({
            slotId: s.id,
            userId: s.preAssignedUserId!,
            gameId: saved.id,
          }),
        ),
      );
      await this.reservationRepository.save(reservations);
    }

    const shouldEmitWebsocket = options.emitWebsocket !== false;
    if (shouldEmitWebsocket) {
      await this.websocketService.broadcast(WebsocketEvents.GameCreated, saved);
    }

    return saved;
  }

  async createManually(
    data: {
      teamAName?: string;
      teamBName?: string;
      isExclusiveToGold?: boolean;
      allowMultipleReservations?: boolean;
      slotConfigs?: Array<{
        slotNumber: number;
        team: string;
        isGoldOnly?: boolean;
        coinsCost?: number | null;
        preAssignedUserId?: number | null;
      }>;
    },
    adminId: number,
  ): Promise<Game> {
    // Game lineage is now: game → stream → schedule. A manual game is always
    // attached to the currently active stream; if there is no active stream,
    // the streamer has not started a session, so there is nothing to attach to.
    // (A game added at 02:00 while last night's stream is still LIVE belongs
    // to that stream — its scheduledStartTime stays on the stream's own day.)
    const activeStream = await this.streamsService.findActiveStream();
    if (!activeStream) {
      throw new BadRequestException(
        'No active stream. Start a stream before adding a manual game.',
      );
    }

    // Skip loading all of the schedule's historical games — we only need
    // schedule metadata (teams, slot configs, firstGameStartTime) here.
    const schedule = await this.schedulesService.findOne(
      activeStream.scheduleId,
      { loadGames: false },
    );

    // scheduledStartTime uses the active stream's day + the schedule's
    // firstGameStartTime — same value the cron uses for bulk-generated games.
    // This keeps manual games sorted alongside cron games (rather than at the
    // top of the bucket by the stream's earlier createdAt). Time is
    // informational only; the streamer controls actual pacing.
    const streamDay = utcStartOfDay(new Date(activeStream.createdAt));
    // MySQL TIME columns load back as "HH:MM:SS" even when written as "HH:MM",
    // so allow the optional seconds segment (and ignore it).
    const timeMatch = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
      schedule.firstGameStartTime ?? '',
    );
    if (!timeMatch) {
      throw new BadRequestException(
        `Schedule ${schedule.id} has invalid firstGameStartTime: ${schedule.firstGameStartTime}`,
      );
    }
    const firstStartHours = Number(timeMatch[1]);
    const firstStartMinutes = Number(timeMatch[2]);
    if (firstStartHours > 23 || firstStartMinutes > 59) {
      throw new BadRequestException(
        `Schedule ${schedule.id} firstGameStartTime out of range: ${schedule.firstGameStartTime}`,
      );
    }
    const scheduledStartTime = new Date(streamDay);
    scheduledStartTime.setUTCHours(firstStartHours, firstStartMinutes, 0, 0);

    // Use custom slot configs if provided, otherwise fall back to schedule defaults
    const rawSlotConfigs = data.slotConfigs?.length
      ? (data.slotConfigs as unknown as SlotConfig[])
      : schedule.slotConfigs ||
        (await this.slotConfigService.findBySchedule(schedule.id));

    // Slot 1 is always claimed by the admin via assignAdminToFirstSlot below.
    // If the source configs pre-assign someone else to slot 1, create() would
    // persist that reservation and the admin assignment would silently no-op
    // (it bails on an already-reserved slot). Strip the pre-assignment here so
    // the admin's slot 1 invariant always wins.
    const slotConfigs: SlotConfig[] = rawSlotConfigs.map((config) =>
      config.slotNumber === 1 && config.preAssignedUserId
        ? { ...config, preAssignedUserId: null }
        : config,
    );

    // Generate a new batch ID for manually created games
    const generationBatchId = randomUUID();

    const game = await this.create({
      status: GameStatus.OPEN,
      scheduledStartTime,
      teamAName: data.teamAName || schedule.teamAName,
      teamBName: data.teamBName || schedule.teamBName,
      isExclusiveToGold:
        data.isExclusiveToGold !== undefined
          ? data.isExclusiveToGold
          : schedule.isExclusiveToGold,
      allowMultipleReservations: !!data.allowMultipleReservations,
      slotsPerGame: schedule.slotsPerGame,
      slotConfigs: slotConfigs,
      generationBatchId,
      gameIndex: await this.getNextGameIndex(activeStream.id),
      streamId: activeStream.id,
    });

    // Auto-assign admin to slot 1
    await this.assignAdminToFirstSlot(game.id, adminId);

    const savedGameIndex = game.gameIndex ?? 1;
    await this.auditService.log({
      userId: adminId,
      action: 'GAME_CREATED_MANUALLY',
      entityType: 'Game',
      entityId: game.id.toString(),
      details: {
        scheduleId: schedule.id,
        scheduledStartTime: scheduledStartTime.toISOString(),
        generationBatchId,
        gameIndex: savedGameIndex,
        streamId: activeStream.id,
      },
    });

    return game;
  }

  /**
   * Assign the admin to slot 1 of a game for free (no coin cost).
   * Creates a confirmed reservation if slot 1 isn't already reserved.
   */
  private async assignAdminToFirstSlot(
    gameId: number,
    adminId: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const slot = await queryRunner.manager.findOne(Slot, {
        where: { gameId, slotNumber: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!slot || slot.isReserved) {
        await queryRunner.rollbackTransaction();
        return;
      }

      slot.isReserved = true;
      slot.reservedByUserId = adminId;
      slot.isPreAssigned = true;
      slot.preAssignedUserId = adminId;
      await queryRunner.manager.save(slot);

      const reservation = queryRunner.manager.create(Reservation, {
        slotId: slot.id,
        userId: adminId,
        gameId,
        status: ReservationStatus.CONFIRMED,
        reservationCostPaid: 0,
        confirmationCostPaid: 0,
        totalCostPaid: 0,
        reservedAt: new Date(),
        confirmedAt: new Date(),
      });
      await queryRunner.manager.save(reservation);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getNextGameIndex(streamId: number): Promise<number> {
    const result = await this.gameRepository
      .createQueryBuilder('game')
      .select('MAX(game.gameIndex)', 'maxIndex')
      .where('game.streamId = :streamId', { streamId })
      .getRawOne();
    return (result?.maxIndex ?? 0) + 1;
  }

  async findAll(
    filters: {
      status?: GameStatus;
      scheduleId?: number;
      streamId?: number;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 25,
  ): Promise<Paginated<Game>> {
    const query = this.gameRepository.createQueryBuilder('game');
    if (filters?.status) {
      query.andWhere('game.status = :status', { status: filters.status });
    }
    if (filters?.streamId) {
      query.andWhere('game.streamId = :streamId', {
        streamId: filters.streamId,
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

    query
      .leftJoinAndSelect('game.stream', 'stream')
      .leftJoinAndSelect('stream.schedule', 'schedule')
      .leftJoinAndSelect('game.slots', 'slots');

    // scheduleId filter applies via the stream's schedule
    if (filters?.scheduleId) {
      query.andWhere('stream.scheduleId = :scheduleId', {
        scheduleId: filters.scheduleId,
      });
    }

    // When filtering by a single stream, order by in-stream game index
    // (Game 1, 2, 3 ...). Otherwise show newest streams' games first,
    // but still preserve in-stream ordering within each group.
    if (filters?.streamId) {
      query.orderBy('game.gameIndex', 'ASC').addOrderBy('game.id', 'ASC');
    } else {
      query
        .orderBy('game.scheduledStartTime', 'DESC')
        .addOrderBy('game.gameIndex', 'ASC')
        .addOrderBy('game.id', 'ASC');
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id },
      relations: [
        'stream',
        'stream.schedule',
        'slots',
        'slots.reservedByUser',
        'slots.preAssignedUser',
        'reservations',
        'reservations.user',
      ],
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let updated: Game;
    try {
      const game = await queryRunner.manager.findOne(Game, {
        where: { id },
        relations: ['stream', 'stream.schedule', 'slots'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!game) {
        throw new BadRequestException('Game not found');
      }

      if (
        game.status !== GameStatus.CREATED &&
        game.status !== GameStatus.OPEN
      ) {
        throw new BadRequestException('Game cannot be started');
      }

      // Check if another game is IN_PROGRESS in the same stream
      if (game.streamId) {
        const inProgressGame = await queryRunner.manager.findOne(Game, {
          where: {
            streamId: game.streamId,
            status: GameStatus.IN_PROGRESS,
          },
        });

        if (inProgressGame && inProgressGame.id !== id) {
          throw new BadRequestException(
            'Another game is already in progress in this stream. Only one game can be in progress at a time.',
          );
        }
      }

      game.status = GameStatus.IN_PROGRESS;
      game.actualStartTime = new Date();
      updated = await queryRunner.manager.save(game);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Get game URL (use game URL if set, otherwise fall back to schedule URL)
    const gameUrl = updated.url || updated.stream?.url || 'https://youtube.com';

    const wsEventData = {
      gameId: updated.id,
      scheduleId: updated.stream?.scheduleId ?? null,
      url: gameUrl,
      teamAName: updated.teamAName,
      teamBName: updated.teamBName,
      scheduledStartTime: updated.scheduledStartTime.toISOString(),
    };

    this.websocketService.broadcast(WebsocketEvents.GameStarted, wsEventData);
    this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
      gameId: updated.id,
      status: GameStatus.IN_PROGRESS,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_STARTED',
      entityType: 'Game',
      entityId: id.toString(),
    });

    return updated;
  }

  async remake(id: number, adminId: number): Promise<Game> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const game = await queryRunner.manager.findOne(Game, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!game) {
        throw new BadRequestException('Game not found');
      }
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException('Only IN_PROGRESS games can be remade');
      }

      game.status = GameStatus.OPEN;
      game.actualStartTime = null;
      const updated = await queryRunner.manager.save(game);

      await queryRunner.commitTransaction();

      this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
        gameId: id,
        status: GameStatus.OPEN,
      });

      await this.auditService.log({
        userId: adminId,
        action: 'GAME_REMADE',
        entityType: 'Game',
        entityId: id.toString(),
      });

      return updated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async finish(
    id: number,
    adminId: number,
    data: { winningTeam: 'A' | 'B'; mvpUserId?: number },
  ): Promise<{ game: Game }> {
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

    // Get game URL (use game URL if set, otherwise fall back to schedule URL)
    const gameUrl = updated.url || updated.stream?.url || 'https://youtube.com';

    this.websocketService.broadcast(WebsocketEvents.GameFinished, {
      gameId: updated.id,
      scheduleId: updated.stream?.scheduleId ?? null,
      url: gameUrl,
      winningTeam: updated.winningTeam,
      teamAName: updated.teamAName,
      teamBName: updated.teamBName,
      actualEndTime: updated.actualEndTime?.toISOString() || null,
    });
    this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
      gameId: updated.id,
      status: GameStatus.FINISHED,
      winningTeam: updated.winningTeam,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'GAME_FINISHED',
      entityType: 'Game',
      entityId: id.toString(),
      details: { winningTeam: data.winningTeam, mvpUserId: data.mvpUserId },
    });

    return { game: updated };
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

    // Allow cancelling CREATED, OPEN, and IN_PROGRESS games
    if (
      game.status !== GameStatus.CREATED &&
      game.status !== GameStatus.OPEN &&
      game.status !== GameStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Only CREATED, OPEN, or IN_PROGRESS games can be cancelled',
      );
    }

    game.status = GameStatus.CANCELLED;
    const updated = await this.gameRepository.save(game);

    // Refund all RESERVED/CONFIRMED reservations on this game
    await this.gameCancellationService.refundReservationsForCancelledGame(
      updated,
    );

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
        statuses: [GameStatus.CREATED, GameStatus.OPEN, GameStatus.IN_PROGRESS],
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
          statuses: [
            GameStatus.CREATED,
            GameStatus.OPEN,
            GameStatus.IN_PROGRESS,
          ],
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

    // Check if we're trying to update fields that are only editable for CREATED games
    const hasCreatedOnlyUpdates =
      data.teamAName !== undefined ||
      data.teamBName !== undefined ||
      data.isExclusiveToGold !== undefined ||
      data.scheduledStartTime !== undefined;

    if (hasCreatedOnlyUpdates && game.status !== GameStatus.CREATED) {
      throw new BadRequestException(
        'Game details can only be edited when status is CREATED',
      );
    }

    if (data.teamAName) game.teamAName = data.teamAName;
    if (data.teamBName) game.teamBName = data.teamBName;
    if (data.isExclusiveToGold !== undefined)
      game.isExclusiveToGold = data.isExclusiveToGold;
    if (data.allowMultipleReservations !== undefined)
      game.allowMultipleReservations = data.allowMultipleReservations;
    if (data.url !== undefined) game.url = data.url;
    if (data.scheduledStartTime) {
      const scheduledStartTime = new Date(data.scheduledStartTime);
      if (isNaN(scheduledStartTime.getTime())) {
        throw new BadRequestException('Invalid scheduledStartTime format');
      }
      game.scheduledStartTime = scheduledStartTime;
    }

    const updated = await this.gameRepository.save(game);

    // When unrestricted mode is enabled, clear gold-only on all slots
    if (data.allowMultipleReservations === true) {
      await this.slotRepository
        .createQueryBuilder()
        .update(Slot)
        .set({ isGoldOnly: false })
        .where('gameId = :gameId', { gameId: id })
        .andWhere('isGoldOnly = :gold', { gold: true })
        .execute();
    }

    // When unrestricted mode is disabled, restore gold-only from schedule slot configs
    const scheduleIdForSlotConfigs = game.stream?.scheduleId;
    if (data.allowMultipleReservations === false && scheduleIdForSlotConfigs) {
      const slotConfigs = await this.slotConfigService.findBySchedule(
        scheduleIdForSlotConfigs,
      );
      const goldConfigs = slotConfigs.filter((c) => c.isGoldOnly);
      for (const config of goldConfigs) {
        await this.slotRepository
          .createQueryBuilder()
          .update(Slot)
          .set({ isGoldOnly: true })
          .where('gameId = :gameId', { gameId: id })
          .andWhere('slotNumber = :slotNumber', {
            slotNumber: config.slotNumber,
          })
          .andWhere('team = :team', { team: config.team })
          .andWhere('reservedByUserId IS NULL')
          .execute();
      }
    }

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

  async preAssignSlot(
    gameId: number,
    slotId: number,
    userId: number | null,
    adminId: number,
  ): Promise<Slot> {
    const game = await this.findOne(gameId);
    return this.slotAdminAssignmentService.preAssignSlot(
      game,
      slotId,
      userId,
      adminId,
    );
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
