import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { Slot } from './entities/slot.entity';
import { RefundPolicy, Schedule } from '../schedules/entities/schedule.entity';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { WebsocketService } from '../websocket/websocket.service';
import { WebsocketEvents } from '../websocket/events';

interface CancelGamesOptions {
  scheduleId: number;
  statuses?: GameStatus[];
  date?: Date;
  adminId?: number;
  audit?: boolean;
  emitWebsocket?: boolean;
  reason?: string;
}

interface CancelGamesByIdsOptions {
  statuses?: GameStatus[];
  adminId?: number;
  audit?: boolean;
  emitWebsocket?: boolean;
  reason?: string;
}

@Injectable()
export class GameCancellationService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Slot)
    private slotRepository: Repository<Slot>,
    private walletService: WalletService,
    private auditService: AuditService,
    private websocketService: WebsocketService,
  ) {}

  async cancelCreatedGamesForSchedule(
    scheduleId: number,
    options?: Omit<CancelGamesOptions, 'scheduleId' | 'statuses'>,
  ): Promise<number> {
    return this.cancelGames({
      scheduleId,
      statuses: [GameStatus.CREATED, GameStatus.OPEN],
      ...options,
    });
  }

  async cancelGamesByIds(
    gameIds: number[],
    options?: CancelGamesByIdsOptions,
  ): Promise<number> {
    if (gameIds.length === 0) {
      return 0;
    }

    const statuses = options?.statuses?.length
      ? options.statuses
      : [GameStatus.CREATED];

    const query = this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.schedule', 'schedule')
      .where('game.id IN (:...gameIds)', { gameIds })
      .andWhere('game.status IN (:...statuses)', { statuses });

    const gamesToCancel = await query.getMany();
    let cancelledCount = 0;

    for (const game of gamesToCancel) {
      game.status = GameStatus.CANCELLED;
      await this.gameRepository.save(game);

      if (options?.emitWebsocket) {
        this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
          gameId: game.id,
          status: GameStatus.CANCELLED,
        });
      }

      if (options?.audit && options.adminId !== undefined) {
        await this.auditService.log({
          userId: options.adminId,
          action: 'GAME_CANCELLED',
          entityType: 'Game',
          entityId: game.id.toString(),
          details: {
            reason: options.reason || 'Cancelled by system',
            scheduleId: game.scheduleId,
          },
        });
      }

      await this.refundReservationsForCancelledGame(game);
      cancelledCount++;
    }

    return cancelledCount;
  }

  private async cancelGames(options: CancelGamesOptions): Promise<number> {
    const statuses = options.statuses?.length
      ? options.statuses
      : [GameStatus.CREATED];

    const query = this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.schedule', 'schedule')
      .where('game.scheduleId = :scheduleId', {
        scheduleId: options.scheduleId,
      })
      .andWhere('game.status IN (:...statuses)', { statuses });

    if (options.date) {
      const { start, end } = this.getDateBounds(options.date);
      query.andWhere('game.scheduledStartTime BETWEEN :start AND :end', {
        start,
        end,
      });
    }

    const gamesToCancel = await query.getMany();
    let cancelledCount = 0;

    if (gamesToCancel.length === 0) {
      return 0;
    }

    const gameIds = gamesToCancel.map((game) => game.id);
    const reservationRows = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('DISTINCT reservation.gameId', 'gameId')
      .where('reservation.gameId IN (:...gameIds)', { gameIds })
      .getRawMany();
    const gameIdsWithReservations = new Set(
      reservationRows.map((row) => Number(row.gameId)),
    );

    const gamesWithoutReservations = gamesToCancel.filter(
      (game) => !gameIdsWithReservations.has(game.id),
    );
    const gamesWithReservations = gamesToCancel.filter((game) =>
      gameIdsWithReservations.has(game.id),
    );

    if (gamesWithoutReservations.length > 0) {
      await this.gameRepository
        .createQueryBuilder()
        .update(Game)
        .set({ status: GameStatus.CANCELLED, updatedAt: new Date() })
        .whereInIds(gamesWithoutReservations.map((game) => game.id))
        .execute();

      if (options.emitWebsocket) {
        for (const game of gamesWithoutReservations) {
          this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
            gameId: game.id,
            status: GameStatus.CANCELLED,
          });
        }
      }

      if (options.audit && options.adminId !== undefined) {
        for (const game of gamesWithoutReservations) {
          await this.auditService.log({
            userId: options.adminId,
            action: 'GAME_CANCELLED',
            entityType: 'Game',
            entityId: game.id.toString(),
            details: {
              reason: options.reason || 'Cancelled by system',
              scheduleId: options.scheduleId ?? game.scheduleId,
            },
          });
        }
      }

      cancelledCount += gamesWithoutReservations.length;
    }

    for (const game of gamesWithReservations) {
      game.status = GameStatus.CANCELLED;
      await this.gameRepository.save(game);

      if (options.emitWebsocket) {
        this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
          gameId: game.id,
          status: GameStatus.CANCELLED,
        });
      }

      if (options.audit && options.adminId !== undefined) {
        await this.auditService.log({
          userId: options.adminId,
          action: 'GAME_CANCELLED',
          entityType: 'Game',
          entityId: game.id.toString(),
          details: {
            reason: options.reason || 'Cancelled by system',
            scheduleId: options.scheduleId ?? game.scheduleId,
          },
        });
      }

      await this.refundReservationsForCancelledGame(game);
      cancelledCount++;
    }

    return cancelledCount;
  }

  private async refundReservationsForCancelledGame(game: Game): Promise<void> {
    const reservations = await this.reservationRepository.find({
      where: { gameId: game.id, status: ReservationStatus.RESERVED },
      relations: ['user', 'user.wallet'],
    });

    for (const reservation of reservations) {
      const refundAmount = this.calculateRefund(reservation, game.schedule);
      if (refundAmount > 0 && reservation.user?.wallet) {
        await this.walletService.deposit(
          reservation.user.wallet.id,
          refundAmount,
          `Refund for cancelled game ${game.id}`,
        );
      }

      reservation.status = ReservationStatus.CANCELLED;
      reservation.cancelledAt = new Date();
      await this.reservationRepository.save(reservation);

      const slot = await this.slotRepository.findOne({
        where: { id: reservation.slotId },
      });
      if (slot) {
        slot.isReserved = false;
        slot.reservedByUserId = null;
        await this.slotRepository.save(slot);
      }
    }
  }

  private calculateRefund(
    reservation: Reservation,
    schedule: Schedule,
  ): number {
    const policy = schedule.refundPolicy;
    if (policy === RefundPolicy.NONE) return 0;
    if (policy === RefundPolicy.FULL) return reservation.totalCostPaid;
    if (policy === RefundPolicy.PARTIAL) {
      const percentage = schedule.refundPercentage || 0;
      return (reservation.totalCostPaid * percentage) / 100;
    }
    return 0;
  }

  private getDateBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }
}
