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
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Slot, Team } from '../games/entities/slot.entity';
import { Game, GameStatus } from '../games/entities/game.entity';
import { User, SubscriptionTier } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { WebsocketService } from '../websocket/websocket.service';
import { StatisticsService } from '../statistics/statistics.service';

@Injectable()
export class ReservationsService {
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
    if (user.isBanned) {
      throw new ForbiddenException('User is banned');
    }

    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['schedule'],
    });

    if (!game || game.status !== GameStatus.OPEN) {
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

    // Check active reservations for games that are CREATED or IN_PROGRESS only
    // Reservations for CANCELLED or FINISHED games should not block new reservations
    const activeReservationsInActiveGames = await this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin('reservation.game', 'game')
      .where('reservation.userId = :userId', { userId })
      .andWhere('reservation.status = :status', {
        status: ReservationStatus.RESERVED,
      })
      .andWhere('game.status IN (:...gameStatuses)', {
        gameStatuses: [GameStatus.OPEN, GameStatus.IN_PROGRESS],
      })
      .getCount();

    if (
      user.subscriptionTier === SubscriptionTier.FREE &&
      activeReservationsInActiveGames > 0
    ) {
      throw new BadRequestException(
        'Free users can only have one active reservation',
      );
    }

    // Player-side validation: check for duplicate reservations in other active games
    // Only block if user has reservation in another game that is CREATED or IN_PROGRESS
    if (!isAdminAction) {
      const otherReservations = await this.reservationRepository.find({
        where: {
          userId,
          status: ReservationStatus.RESERVED,
        },
        relations: ['game'],
      });

      const confirmedReservations = await this.reservationRepository.find({
        where: {
          userId,
          status: ReservationStatus.CONFIRMED,
        },
        relations: ['game'],
      });

      const allOtherReservations = [
        ...otherReservations,
        ...confirmedReservations,
      ];

      // Only consider reservations in active games (CREATED or IN_PROGRESS)
      // Ignore reservations for CANCELLED or FINISHED games
      const hasOtherActiveReservation = allOtherReservations.some(
        (r) =>
          r.gameId !== gameId &&
          (r.game.status === GameStatus.OPEN ||
            r.game.status === GameStatus.IN_PROGRESS),
      );

      if (hasOtherActiveReservation) {
        throw new BadRequestException(
          'You already have a reservation in another game. Please cancel it first.',
        );
      }
    }

    // Check team balance
    const teamSlots = await this.slotRepository.find({
      where: { gameId, team },
    });
    const reservedTeamSlots = teamSlots.filter((s) => s.isReserved).length;
    // Get total slots per team from the schedule
    const totalSlotsPerTeam = game.schedule
      ? game.schedule.slotsPerGame / 2
      : 5;
    if (reservedTeamSlots >= totalSlotsPerTeam) {
      throw new BadRequestException('Team is full');
    }

    // Determine reservation type and cost
    const instantReservationCost = game.schedule.instantReservationCost;
    const useInstant =
      useInstantReservation &&
      instantReservationCost &&
      instantReservationCost > 0;

    let reservationCost = game.schedule.reservationCost;
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

    // Check balance
    const balance = await this.walletService.getBalance(userId);
    if (balance < reservationCost) {
      throw new BadRequestException('Insufficient balance');
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

      // Charge wallet
      await this.walletService.withdrawWithManager(
        queryRunner.manager,
        user.wallet.id,
        reservationCost,
        useInstant
          ? `Instant reservation for game ${gameId}`
          : `Reservation for game ${gameId}`,
      );

      // Create reservation
      const reservation = queryRunner.manager.create(Reservation, {
        slotId,
        userId,
        gameId,
        status: useInstant
          ? ReservationStatus.CONFIRMED
          : ReservationStatus.RESERVED,
        reservationCostPaid: reservationCost,
        confirmationCostPaid: 0, // Confirmation cost is always 0 now
        totalCostPaid: reservationCost,
        discountApplied,
        originalCost,
        reservedAt: new Date(),
        confirmedAt: useInstant ? new Date() : null,
      });

      const saved = await queryRunner.manager.save(reservation);

      // Update slot
      slot.isReserved = true;
      slot.reservedByUserId = userId;
      await queryRunner.manager.save(slot);

      await queryRunner.commitTransaction();

      await this.statisticsService.incrementReservations(userId);
      await this.statisticsService.addCoinsSpent(userId, reservationCost);

      await this.websocketService.broadcast('reservation:created', {
        reservationId: saved.id,
        gameId,
        slotId,
        userId,
        status: saved.status,
      });

      if (useInstant) {
        await this.websocketService.broadcast('reservation:confirmed', {
          reservationId: saved.id,
          gameId: game.id,
        });
      }

      await this.auditService.log({
        userId,
        userEmail: user.email,
        action: useInstant
          ? 'RESERVATION_INSTANT_CONFIRMED'
          : 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: saved.id.toString(),
        details: {
          gameId,
          slotId,
          cost: reservationCost,
          discountApplied,
          instantReservation: useInstant,
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
      relations: ['game', 'game.schedule'],
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.RESERVED) {
      throw new BadRequestException('Reservation cannot be confirmed');
    }

    const game = reservation.game;
    const now = new Date();
    const confirmationWindow = new Date(game.scheduledStartTime);
    confirmationWindow.setMinutes(
      confirmationWindow.getMinutes() - game.schedule.confirmationWindowMinutes,
    );

    if (now > confirmationWindow) {
      throw new BadRequestException('Confirmation deadline has passed');
    }

    // Confirmation cost is always 0 now
    const confirmationCost = 0;

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();
    reservation.confirmationCostPaid = confirmationCost;
    // Total cost remains the same since confirmation is free
    reservation.totalCostPaid = reservation.reservationCostPaid;
    const updated = await this.reservationRepository.save(reservation);

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
      relations: ['game', 'game.schedule', 'slot'],
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    if (reservation.game.status === GameStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Cannot cancel reservation for game in progress',
      );
    }

    const refundAmount = this.calculateRefund(reservation);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (refundAmount > 0) {
      await this.walletService.deposit(
        user.wallet.id,
        refundAmount,
        `Refund for cancelled reservation ${reservationId}`,
      );
    }

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    await this.reservationRepository.save(reservation);

    reservation.slot.isReserved = false;
    reservation.slot.reservedByUserId = null;
    await this.slotRepository.save(reservation.slot);

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
   * Calculates refund amount based on schedule refund policy.
   *
   * @param reservation - The reservation to calculate refund for
   * @returns Refund amount in coins
   */
  private calculateRefund(reservation: Reservation): number {
    const policy = reservation.game.schedule.refundPolicy;
    if (policy === 'NONE') return 0;
    if (policy === 'FULL') return reservation.totalCostPaid;
    if (policy === 'PARTIAL') {
      const percentage = reservation.game.schedule.refundPercentage || 0;
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
