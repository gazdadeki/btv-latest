import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../games/entities/game.entity';
import { Slot, Team } from '../games/entities/slot.entity';
import { User, SubscriptionTier } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { StreamsService } from '../streams/streams.service';
import { ReservationsService } from '../reservations/reservations.service';
import { AvatarsService } from '../avatars/avatars.service';
import { utcStartOfDay } from '../common/date.utils';

/**
 * Interface for slot data with username information.
 * Extends slot data with reservedByUsername for client display.
 */
export interface SlotWithUsername {
  id: number;
  gameId: number;
  slotNumber: number;
  team: Team;
  isReserved: boolean;
  reservedByUserId: number | null;
  reservedByUsername: string | null;
  reservedByRole: string | null;
  reservedByAvatarUrl: string | null;
  reservationId: number | null;
  reservationStatus: string | null;
  isPreAssigned: boolean;
  preAssignedUserId: number | null;
  isGoldOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for game details with enriched slot information.
 */
export interface GameWithEnrichedSlots extends Omit<Game, 'slots'> {
  slots: SlotWithUsername[];
}

/**
 * Interface for game status filter options.
 */
export interface GameStatusFilters {
  includeCreated: boolean;
  includeOpen: boolean;
  includeInProgress: boolean;
  includeFinished: boolean;
  includeCancelled: boolean;
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Slot)
    private slotRepository: Repository<Slot>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    private streamsService: StreamsService,
    private reservationsService: ReservationsService,
  ) {}

  /**
   * Get available games for a user.
   * Filters out Gold-exclusive games for non-Gold users.
   *
   * @param user - The requesting user
   * @returns List of available games
   */
  async getAvailableGames(user: User): Promise<Game[]> {
    const query = this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.stream', 'stream')
      .leftJoinAndSelect('stream.schedule', 'schedule')
      .leftJoinAndSelect('game.slots', 'slots')
      .where('game.status = :status', { status: GameStatus.CREATED })
      .andWhere('game.scheduledStartTime > :now', { now: new Date() });

    if (user.subscriptionTier !== SubscriptionTier.GOLD) {
      query.andWhere('game.isExclusiveToGold = :exclusive', {
        exclusive: false,
      });
    }

    return query
      .orderBy('game.gameIndex', 'ASC')
      .addOrderBy('game.id', 'ASC')
      .getMany();
  }

  /**
   * Get game details with enriched slot information.
   * Includes username for reserved slots so clients can display who reserved each slot.
   *
   * @param gameId - The game ID to fetch
   * @param user - The requesting user
   * @returns Game details with enriched slot data including reservedByUsername
   */
  async getGameDetails(
    gameId: number,
    user: User,
  ): Promise<GameWithEnrichedSlots> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: [
        'stream',
        'stream.schedule',
        'slots',
        'reservations',
        'reservations.user',
        'reservations.user.avatar',
      ],
    });

    if (!game) {
      throw new ForbiddenException('Game not found');
    }

    if (
      game.isExclusiveToGold &&
      user.subscriptionTier !== SubscriptionTier.GOLD
    ) {
      throw new ForbiddenException(
        'This game is exclusive to Gold subscribers',
      );
    }

    // Enrich slots with username information from reservations
    const enrichedSlots: SlotWithUsername[] = game.slots.map((slot) => {
      // Find the active reservation for this slot
      const reservation = game.reservations?.find(
        (r) =>
          r.slotId === slot.id &&
          (r.status === 'RESERVED' || r.status === 'CONFIRMED'),
      );

      return {
        id: slot.id,
        gameId: slot.gameId,
        slotNumber: slot.slotNumber,
        team: slot.team,
        isReserved: slot.isReserved,
        reservedByUserId: slot.reservedByUserId,
        reservedByUsername: reservation?.user?.username || null,
        reservedByRole: reservation?.user?.role || null,
        reservedByAvatarUrl: reservation?.user?.avatar
          ? AvatarsService.buildUrl(reservation.user.avatar.filename)
          : null,
        reservationId: reservation?.id || null,
        reservationStatus: reservation?.status || null,
        isPreAssigned: slot.isPreAssigned,
        preAssignedUserId: slot.preAssignedUserId,
        isGoldOnly: slot.isGoldOnly,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
      };
    });

    // Return game with enriched slots
    const result: GameWithEnrichedSlots = {
      ...game,
      slots: enrichedSlots,
    };

    return result;
  }

  /**
   * Get slots for a game with username information.
   *
   * @param gameId - The game ID
   * @param user - The requesting user
   * @returns List of slots with username information
   */
  async getGameSlots(gameId: number, user: User): Promise<SlotWithUsername[]> {
    const game = await this.getGameDetails(gameId, user);
    return game.slots;
  }

  /**
   * Reserve a slot in a game.
   *
   * @param gameId - The game ID
   * @param slotId - The slot ID to reserve
   * @param team - The team (A or B)
   * @param user - The requesting user
   * @param useInstantReservation - Whether to use instant reservation
   * @returns The created reservation
   */
  async reserveSlot(
    gameId: number,
    slotId: number,
    team: Team,
    user: User,
    useInstantReservation: boolean = false,
  ) {
    // This will call ReservationsService.create with isAdminAction=false
    return this.reservationsService.create(
      user.id,
      gameId,
      slotId,
      team,
      useInstantReservation,
      false, // isAdminAction = false for player actions
    );
  }

  /**
   * Get schedules with today's games for a user.
   * Supports filtering by game status.
   *
   * @param user - The requesting user
   * @param filters - Optional status filters (defaults to excluding cancelled)
   * @returns List of schedules with their games for today
   */
  async getSchedulesForToday(
    user: User,
    filters?: GameStatusFilters,
  ): Promise<Array<{ schedule: Schedule; games: Game[] }>> {
    const today = utcStartOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Default filters: show all except cancelled
    const statusFilters = filters || {
      includeCreated: true,
      includeOpen: true,
      includeInProgress: true,
      includeFinished: true,
      includeCancelled: false,
    };

    // Build list of statuses to include
    const statuses: GameStatus[] = [];
    if (statusFilters.includeCreated) statuses.push(GameStatus.CREATED);
    if (statusFilters.includeOpen) statuses.push(GameStatus.OPEN);
    if (statusFilters.includeInProgress) statuses.push(GameStatus.IN_PROGRESS);
    if (statusFilters.includeFinished) statuses.push(GameStatus.FINISHED);
    if (statusFilters.includeCancelled) statuses.push(GameStatus.CANCELLED);

    // If no statuses selected, return empty
    if (statuses.length === 0) {
      return [];
    }

    // Get all active schedules
    const schedules = await this.scheduleRepository.find({
      where: { isActive: true },
    });

    if (schedules.length === 0) {
      return [];
    }

    // Single query for today's games across all active schedules, then group
    // in memory — avoids one DB round-trip per schedule (N+1).
    const scheduleIds = schedules.map((s) => s.id);
    const todayGames = await this.gameRepository
      .createQueryBuilder('game')
      .innerJoinAndSelect('game.stream', 'stream')
      .leftJoinAndSelect('game.slots', 'slots')
      .where('stream.scheduleId IN (:...scheduleIds)', { scheduleIds })
      .andWhere('game.scheduledStartTime >= :today', { today })
      .andWhere('game.scheduledStartTime < :tomorrow', { tomorrow })
      .andWhere('game.status IN (:...statuses)', { statuses })
      .orderBy('game.gameIndex', 'ASC')
      .addOrderBy('game.id', 'ASC')
      .getMany();

    const gamesByScheduleId = new Map<number, Game[]>();
    for (const game of todayGames) {
      if (
        game.isExclusiveToGold &&
        user.subscriptionTier !== SubscriptionTier.GOLD
      ) {
        continue;
      }
      const scheduleId = game.stream?.scheduleId;
      if (scheduleId == null) continue;
      const bucket = gamesByScheduleId.get(scheduleId);
      if (bucket) bucket.push(game);
      else gamesByScheduleId.set(scheduleId, [game]);
    }

    const result: Array<{ schedule: Schedule; games: Game[] }> = [];
    for (const schedule of schedules) {
      const games = gamesByScheduleId.get(schedule.id);
      if (games && games.length > 0) {
        result.push({ schedule, games });
      }
    }

    return result;
  }

  async getActiveStream(
    user: User,
    filters?: GameStatusFilters,
  ): Promise<{
    stream: {
      id: number;
      status: string;
      title: string;
      url: string | null;
      scheduleId: number;
      scheduleName: string;
      teamAName: string;
      teamBName: string;
    };
    games: GameWithEnrichedSlots[];
  } | null> {
    // Prefer LIVE stream; fall back to PENDING if no LIVE stream exists
    const stream = await this.streamsService.findPlayerVisibleStream();

    if (!stream) {
      return null;
    }

    // Default filters: show all except cancelled
    const statusFilters = filters || {
      includeCreated: true,
      includeOpen: true,
      includeInProgress: true,
      includeFinished: true,
      includeCancelled: false,
    };

    const statuses: GameStatus[] = [];
    if (statusFilters.includeCreated) statuses.push(GameStatus.CREATED);
    if (statusFilters.includeOpen) statuses.push(GameStatus.OPEN);
    if (statusFilters.includeInProgress) statuses.push(GameStatus.IN_PROGRESS);
    if (statusFilters.includeFinished) statuses.push(GameStatus.FINISHED);
    if (statusFilters.includeCancelled) statuses.push(GameStatus.CANCELLED);

    if (statuses.length === 0) {
      return {
        stream: {
          id: stream.id,
          status: stream.status,
          title: stream.title,
          url: stream.url ?? null,
          scheduleId: stream.scheduleId,
          scheduleName: stream.schedule?.name || '',
          teamAName: stream.schedule?.teamAName || '',
          teamBName: stream.schedule?.teamBName || '',
        },
        games: [],
      };
    }

    const query = this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.slots', 'slots')
      .leftJoinAndSelect(
        'game.reservations',
        'reservations',
        'reservations.status IN (:...activeStatuses)',
        { activeStatuses: ['RESERVED', 'CONFIRMED'] },
      )
      .leftJoinAndSelect('reservations.user', 'reservationUser')
      .leftJoinAndSelect('reservationUser.avatar', 'reservationUserAvatar')
      .where('game.streamId = :streamId', { streamId: stream.id })
      .andWhere('game.status IN (:...statuses)', { statuses })
      .orderBy('game.gameIndex', 'ASC')
      .addOrderBy('game.id', 'ASC');

    if (user.subscriptionTier !== SubscriptionTier.GOLD) {
      query.andWhere('game.isExclusiveToGold = :exclusive', {
        exclusive: false,
      });
    }

    const games = await query.getMany();

    const enrichedGames = games.map((game) => {
      const enrichedSlots: SlotWithUsername[] = game.slots.map((slot) => {
        const reservation = game.reservations?.find(
          (r) =>
            r.slotId === slot.id &&
            (r.status === 'RESERVED' || r.status === 'CONFIRMED'),
        );
        return {
          id: slot.id,
          gameId: slot.gameId,
          slotNumber: slot.slotNumber,
          team: slot.team,
          isReserved: slot.isReserved,
          reservedByUserId: slot.reservedByUserId,
          reservedByUsername: reservation?.user?.username || null,
          reservedByRole: reservation?.user?.role || null,
          reservedByAvatarUrl: reservation?.user?.avatar
            ? AvatarsService.buildUrl(reservation.user.avatar.filename)
            : null,
          reservationId: reservation?.id || null,
          reservationStatus: reservation?.status || null,
          isPreAssigned: slot.isPreAssigned,
          preAssignedUserId: slot.preAssignedUserId,
          isGoldOnly: slot.isGoldOnly,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        };
      });
      return { ...game, slots: enrichedSlots };
    });

    return {
      stream: {
        id: stream.id,
        status: stream.status,
        title: stream.title ?? '',
        url: stream.url ?? null,
        scheduleId: stream.scheduleId,
        scheduleName: stream.schedule?.name || '',
        teamAName: stream.schedule?.teamAName || '',
        teamBName: stream.schedule?.teamBName || '',
      },
      games: enrichedGames,
    };
  }
}
