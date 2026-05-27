/**
 * Reservations Service
 *
 * Handles all reservation-related operations including creating, confirming,
 * and cancelling slot reservations for games. Manages wallet transactions,
 * applies subscription discounts, and enforces reservation rules.
 */
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, QueryRunner } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Slot, Team } from '../games/entities/slot.entity';
import { Game, GameStatus } from '../games/entities/game.entity';
import { User, SubscriptionTier } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { WebsocketService } from '../websocket/websocket.service';
import { StatisticsService } from '../statistics/statistics.service';
import { StreamsService } from '../streams/streams.service';
import { clearSlotAssignment } from '../common/reservation.utils';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Slot)
    private slotRepository: Repository<Slot>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
    private configService: ConfigService,
    private auditService: AuditService,
    private websocketService: WebsocketService,
    private statisticsService: StatisticsService,
    private streamsService: StreamsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Creates a new reservation for a game slot.
   * Validates user eligibility, checks for existing active reservations,
   * processes payment, and updates slot status.
   *
   * @param userId - ID of the user making the reservation
   * @param gameId - ID of the game to reserve a slot in
   * @param slotId - ID of the specific slot to reserve
   * @param team - Team (A or B) the slot belongs to
   * @param useInstantReservation - Whether to use instant reservation (auto-confirm)
   * @param isAdminAction - Whether this is an admin-initiated reservation (bypasses some checks)
   * @returns The created reservation entity
   */
  async create(
    userId: number,
    gameId: number,
    slotId: number,
    team: Team,
    useInstantReservation: boolean = false,
    isAdminAction: boolean = false,
  ): Promise<Reservation> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet', 'subscription'],
    });

    if (!user.isVerified) {
      throw new ForbiddenException('User must be verified');
    }

    // Banned users cannot reserve, regardless of membership tier. Enforced here
    // (the single chokepoint every reservation path funnels through) rather than
    // only via NotBannedGuard, since the mobile reserve route on PlayersController
    // does not carry that guard. Mirrors the guard's temp-ban semantics: an
    // expired temp ban (bannedUntil in the past) is not blocking.
    if (user.isBanned) {
      const now = new Date();
      if (user.bannedUntil && user.bannedUntil > now) {
        throw new ForbiddenException(
          `User is banned until ${user.bannedUntil.toISOString()}`,
        );
      }
      if (!user.bannedUntil) {
        throw new ForbiddenException('User is permanently banned');
      }
    }

    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['stream', 'stream.schedule'],
    });

    if (!game) {
      throw new BadRequestException('Game not available for reservation');
    }

    const schedule = game.stream?.schedule;
    if (!schedule) {
      throw new BadRequestException('Game not available for reservation');
    }

    const allowedStatuses =
      user.subscriptionTier === SubscriptionTier.GOLD
        ? [GameStatus.CREATED, GameStatus.OPEN]
        : [GameStatus.OPEN];

    if (!allowedStatuses.includes(game.status)) {
      throw new BadRequestException('Game not available for reservation');
    }

    if (
      game.isExclusiveToGold &&
      user.subscriptionTier !== SubscriptionTier.GOLD
    ) {
      throw new ForbiddenException(
        'This game is exclusive to Gold subscribers',
      );
    }

    // Check team balance
    const teamSlots = await this.slotRepository.find({
      where: { gameId, team },
    });
    const reservedTeamSlots = teamSlots.filter((s) => s.isReserved).length;
    // Get total slots per team from the schedule
    const totalSlotsPerTeam = schedule.slotsPerGame / 2;
    if (reservedTeamSlots >= totalSlotsPerTeam) {
      throw new BadRequestException('Team is full');
    }

    // Determine reservation type and cost
    const instantReservationCost = schedule.instantReservationCost;
    const useInstant =
      useInstantReservation &&
      instantReservationCost &&
      instantReservationCost > 0;

    let reservationCost = schedule.reservationCost;
    let discountApplied = 0;
    const originalCost = reservationCost;

    if (user.subscriptionTier === SubscriptionTier.GOLD) {
      const discountPercentage = this.configService.getGoldDiscountPercentage();
      discountApplied = (reservationCost * discountPercentage) / 100;
      reservationCost = reservationCost - discountApplied;
    }

    // If using instant reservation, use instantReservationCost instead
    if (useInstant) {
      const instantCost = instantReservationCost!;
      const instantDiscount =
        user.subscriptionTier === SubscriptionTier.GOLD
          ? (instantCost * this.configService.getGoldDiscountPercentage()) / 100
          : 0;
      reservationCost = instantCost - instantDiscount;
      discountApplied = instantDiscount;
    }

    // Check balance (only if reservation has a cost)
    if (reservationCost > 0) {
      const balance = await this.walletService.getBalance(userId);
      if (balance < reservationCost) {
        throw new BadRequestException('Insufficient balance');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const slot = await queryRunner.manager.findOne(Slot, {
        where: { id: slotId, gameId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!slot || slot.isReserved) {
        throw new BadRequestException('Slot not available');
      }

      if (slot.team !== team) {
        throw new BadRequestException(
          'Slot team does not match requested team',
        );
      }

      // Same-game duplicate guard — always enforced, no exceptions
      if (!isAdminAction) {
        const existingReservation = await queryRunner.manager.findOne(
          Reservation,
          {
            where: {
              userId,
              gameId,
              status: In([
                ReservationStatus.RESERVED,
                ReservationStatus.CONFIRMED,
              ]),
            },
          },
        );
        if (existingReservation) {
          throw new BadRequestException(
            'You already have a reservation in this game',
          );
        }

        // Also check slot-level assignment (safety net for pre-assigned slots)
        const existingSlot = await queryRunner.manager.findOne(Slot, {
          where: {
            gameId,
            reservedByUserId: userId,
            isReserved: true,
          },
        });
        if (existingSlot) {
          throw new BadRequestException(
            'You already have a reservation in this game',
          );
        }
      }

      // Slot-level gold restriction (bypassed for unrestricted games)
      if (
        !isAdminAction &&
        !game.allowMultipleReservations &&
        slot.isGoldOnly &&
        user.subscriptionTier !== SubscriptionTier.GOLD
      ) {
        throw new ForbiddenException(
          'This slot is exclusive to Gold subscribers',
        );
      }

      // Gold-first rule: gold users must fill gold slots before reserving free slots
      if (
        !isAdminAction &&
        !game.allowMultipleReservations &&
        !slot.isGoldOnly &&
        user.subscriptionTier === SubscriptionTier.GOLD
      ) {
        const availableGoldSlots = await queryRunner.manager.count(Slot, {
          where: {
            gameId,
            isGoldOnly: true,
            isReserved: false,
          },
        });
        if (availableGoldSlots > 0) {
          throw new BadRequestException(
            'Please reserve a gold slot first. Gold slots are still available.',
          );
        }
      }

      // Reservation limit check (inside transaction for consistency)
      if (!isAdminAction && !game.allowMultipleReservations) {
        const countQuery = queryRunner.manager
          .createQueryBuilder(Reservation, 'reservation')
          .innerJoin('reservation.game', 'game')
          .where('reservation.userId = :userId', { userId })
          .andWhere('reservation.status IN (:...resStatuses)', {
            resStatuses: [
              ReservationStatus.RESERVED,
              ReservationStatus.CONFIRMED,
            ],
          })
          .andWhere('game.status IN (:...gameStatuses)', {
            gameStatuses: [
              GameStatus.CREATED,
              GameStatus.OPEN,
              GameStatus.IN_PROGRESS,
            ],
          });

        // Exclude unrestricted games from the count
        countQuery.andWhere('game.allowMultipleReservations = :restricted', {
          restricted: false,
        });

        if (game.streamId != null) {
          countQuery.andWhere('game.streamId = :streamId', {
            streamId: game.streamId,
          });
        } else {
          countQuery.andWhere('game.streamId IS NULL');
        }

        const activeReservationCount = await countQuery.getCount();

        const maxReservations =
          user.subscriptionTier === SubscriptionTier.GOLD ? 2 : 1;

        if (activeReservationCount >= maxReservations) {
          throw new BadRequestException(
            user.subscriptionTier === SubscriptionTier.GOLD
              ? 'Gold users can have at most 2 active reservations'
              : 'Free users can only have one active reservation',
          );
        }
      }

      // Charge wallet (only if reservation has a cost)
      if (reservationCost > 0) {
        await this.walletService.withdrawWithManager(
          queryRunner.manager,
          user.wallet.id,
          reservationCost,
          useInstant
            ? `Instant reservation for game ${gameId}`
            : `Reservation for game ${gameId}`,
        );
      }

      // Auto-confirm if schedule doesn't require confirmation, or if instant reservation
      const autoConfirm = !schedule.requiresConfirmation || useInstant;

      // Create reservation
      const reservation = queryRunner.manager.create(Reservation, {
        slotId,
        userId,
        gameId,
        status: autoConfirm
          ? ReservationStatus.CONFIRMED
          : ReservationStatus.RESERVED,
        reservationCostPaid: reservationCost,
        confirmationCostPaid: 0,
        totalCostPaid: reservationCost,
        discountApplied,
        originalCost,
        reservedAt: new Date(),
        confirmedAt: autoConfirm ? new Date() : null,
      });

      const saved = await queryRunner.manager.save(reservation);

      // Update slot
      slot.isReserved = true;
      slot.reservedByUserId = userId;
      await queryRunner.manager.save(slot);

      await queryRunner.commitTransaction();

      if (reservationCost > 0) {
        await this.statisticsService.addCoinsSpent(userId, reservationCost);
      }

      await this.websocketService.broadcast('reservation:created', {
        reservationId: saved.id,
        gameId,
        slotId,
        userId,
        status: saved.status,
      });

      if (autoConfirm) {
        await this.websocketService.broadcast('reservation:confirmed', {
          reservationId: saved.id,
          gameId: game.id,
        });
      }

      await this.auditService.log({
        userId,
        userEmail: user.email,
        action: autoConfirm
          ? 'RESERVATION_AUTO_CONFIRMED'
          : 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: saved.id.toString(),
        details: {
          gameId,
          slotId,
          cost: reservationCost,
          discountApplied,
          autoConfirmed: autoConfirm,
        },
      });

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Confirms a pending reservation.
   * Must be done within the confirmation window before game starts.
   *
   * @param reservationId - ID of the reservation to confirm
   * @param userId - ID of the user confirming (must own the reservation)
   * @returns The updated reservation entity
   */
  async confirm(reservationId: number, userId: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, userId },
      relations: ['game', 'game.stream', 'game.stream.schedule'],
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.RESERVED) {
      throw new BadRequestException('Reservation cannot be confirmed');
    }

    const game = reservation.game;
    const schedule = game.stream?.schedule;
    if (!schedule) {
      throw new BadRequestException('Reservation cannot be confirmed');
    }
    const now = new Date();
    const confirmationWindow = new Date(game.scheduledStartTime);
    confirmationWindow.setUTCMinutes(
      confirmationWindow.getUTCMinutes() - schedule.confirmationWindowMinutes,
    );

    if (now > confirmationWindow) {
      throw new BadRequestException('Confirmation deadline has passed');
    }

    // Confirmation cost is always 0 now
    const confirmationCost = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let updated: Reservation;
    try {
      reservation.status = ReservationStatus.CONFIRMED;
      reservation.confirmedAt = new Date();
      reservation.confirmationCostPaid = confirmationCost;
      // Total cost remains the same since confirmation is free
      reservation.totalCostPaid = reservation.reservationCostPaid;
      updated = await queryRunner.manager.save(reservation);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.websocketService.broadcast('reservation:confirmed', {
      reservationId,
      gameId: game.id,
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    await this.auditService.log({
      userId,
      userEmail: user?.email,
      action: 'RESERVATION_CONFIRMED',
      entityType: 'Reservation',
      entityId: reservationId.toString(),
    });

    return updated;
  }

  /**
   * Cancels a reservation and processes refund if applicable.
   * Cannot cancel reservations for games already in progress.
   *
   * @param reservationId - ID of the reservation to cancel
   * @param userId - ID of the user cancelling (must own the reservation)
   */
  async cancel(reservationId: number, userId: number): Promise<void> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, userId },
      relations: ['game', 'game.stream', 'game.stream.schedule', 'slot'],
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    if (reservation.game.status === GameStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Cannot cancel reservation for game in progress',
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let refundAmount: number;
    try {
      refundAmount = await this.performCancel(
        reservation,
        user,
        queryRunner,
        `Refund for cancelled reservation ${reservationId}`,
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.websocketService.broadcast('reservation:cancelled', {
      reservationId,
      gameId: reservation.gameId,
      slotId: reservation.slotId,
    });

    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'RESERVATION_CANCELLED',
      entityType: 'Reservation',
      entityId: reservationId.toString(),
      details: { refundAmount },
    });
  }

  /**
   * Cancels a single reservation inside an existing transaction: refunds wallet
   * (if applicable), flips status to CANCELLED, and clears the slot.
   * The caller owns transaction lifecycle (begin/commit/rollback) and
   * post-commit side effects (broadcast, audit).
   */
  private async performCancel(
    reservation: Reservation,
    user: User,
    queryRunner: QueryRunner,
    refundDescription: string,
  ): Promise<number> {
    const refundAmount = this.calculateRefund(reservation);

    if (refundAmount > 0) {
      await this.walletService.deposit(
        user.wallet.id,
        refundAmount,
        refundDescription,
        queryRunner.manager,
      );
    }

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    await queryRunner.manager.save(reservation);

    clearSlotAssignment(reservation.slot);
    await queryRunner.manager.save(reservation.slot);

    return refundAmount;
  }

  /**
   * Auto-releases a user's RESERVED/CONFIRMED reservations on the currently
   * active stream's CREATED/OPEN games. Used when an admin bans the user so
   * their slots free up and refunds are issued per schedule policy.
   * Reservations in IN_PROGRESS/FINISHED games are not touched.
   *
   * @returns Number of reservations released
   */
  async releaseUserFromActiveStream(
    userId: number,
    reason: string,
  ): Promise<number> {
    const activeStream = await this.streamsService.findPlayerVisibleStream();
    if (!activeStream) return 0;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });
    if (!user) return 0;

    const reservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoinAndSelect('reservation.game', 'game')
      .innerJoinAndSelect('game.stream', 'stream')
      .innerJoinAndSelect('stream.schedule', 'schedule')
      .innerJoinAndSelect('reservation.slot', 'slot')
      .where('reservation.userId = :userId', { userId })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.RESERVED, ReservationStatus.CONFIRMED],
      })
      .andWhere('game.streamId = :streamId', { streamId: activeStream.id })
      .andWhere('game.status IN (:...gameStatuses)', {
        gameStatuses: [GameStatus.CREATED, GameStatus.OPEN],
      })
      .getMany();

    if (reservations.length === 0) return 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const released: Array<{ reservation: Reservation; refundAmount: number }> =
      [];
    try {
      for (const reservation of reservations) {
        const refundAmount = await this.performCancel(
          reservation,
          user,
          queryRunner,
          `Refund for reservation ${reservation.id} released after ${reason}`,
        );
        released.push({ reservation, refundAmount });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // The release transaction has already committed (slots freed, refunds
    // issued). Broadcast/audit are post-commit side effects, so a failure here
    // must not throw away a successful release — isolate each one.
    for (const { reservation, refundAmount } of released) {
      try {
        await this.websocketService.broadcast('reservation:cancelled', {
          reservationId: reservation.id,
          gameId: reservation.gameId,
          slotId: reservation.slotId,
        });

        await this.auditService.log({
          userId,
          userEmail: user.email,
          action: 'RESERVATION_AUTO_CANCELLED_BAN',
          entityType: 'Reservation',
          entityId: reservation.id.toString(),
          details: { refundAmount, reason },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Post-release side effect failed for reservation ${reservation.id} (release already committed): ${message}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }

    return released.length;
  }

  /**
   * Calculates refund amount based on schedule refund policy.
   *
   * @param reservation - The reservation to calculate refund for
   * @returns Refund amount in coins
   */
  private calculateRefund(reservation: Reservation): number {
    const schedule = reservation.game.stream?.schedule;
    if (!schedule) return 0;
    const policy = schedule.refundPolicy;
    if (policy === 'NONE') return 0;
    if (policy === 'FULL') return reservation.totalCostPaid;
    if (policy === 'PARTIAL') {
      const percentage = schedule.refundPercentage || 0;
      return (reservation.totalCostPaid * percentage) / 100;
    }
    return 0;
  }

  /**
   * Retrieves all reservations for a specific user.
   * Returns all statuses so client can filter as needed.
   *
   * @param userId - ID of the user
   * @returns Array of user's reservations with game and slot relations
   */
  async findUserReservations(userId: number): Promise<Reservation[]> {
    // Return all reservations (RESERVED, CONFIRMED, CANCELLED, EXPIRED) so client can filter
    return this.reservationRepository.find({
      where: {
        userId,
      },
      relations: ['game', 'slot'],
      order: { createdAt: 'DESC' },
    });
  }
}
