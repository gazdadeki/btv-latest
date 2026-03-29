import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Game, GameStatus } from '../games/entities/game.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { Slot } from '../games/entities/slot.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { WebsocketService } from '../websocket/websocket.service';
import { NotificationType } from '@/firebase/entities/notification-history.entity';

/**
 * Service for checking and processing reservation confirmations.
 * Automatically expires unconfirmed reservations when the confirmation deadline passes.
 * Also sends reminder notifications before the confirmation deadline.
 */
@Injectable()
export class ConfirmationCheckerService {
  private readonly logger = new Logger(ConfirmationCheckerService.name);
  private readonly batchSize = 200;

  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private dataSource: DataSource,
    private firebaseService: FirebaseService,
    private websocketService: WebsocketService,
  ) {}

  /**
   * Check all games with upcoming confirmation deadlines and process expired reservations.
   * Also sends reminder notifications for reservations approaching their confirmation deadline.
   */
  async checkConfirmations(): Promise<{
    expiredCount: number;
    reminderNotifications: number;
  }> {
    const now = new Date();
    const expiredCount = await this.expireReservations(now);
    const reminderNotifications = await this.sendReminderNotifications(now);
    return { expiredCount, reminderNotifications };
  }

  private async expireReservations(now: Date): Promise<number> {
    const candidates = await this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin('reservation.game', 'game')
      .innerJoin('game.schedule', 'schedule')
      .select([
        'reservation.id AS reservationId',
        'reservation.slotId AS slotId',
        'reservation.userId AS userId',
      ])
      .where('reservation.status = :status', {
        status: ReservationStatus.RESERVED,
      })
      .andWhere('game.status = :gameStatus', {
        gameStatus: GameStatus.CREATED,
      })
      .andWhere(
        'game.scheduledStartTime <= DATE_ADD(:now, INTERVAL schedule.confirmationWindowMinutes MINUTE)',
        { now },
      )
      .getRawMany();

    if (candidates.length === 0) {
      return 0;
    }

    let expiredCount = 0;
    const batches = this.chunk(candidates, this.batchSize);
    for (const batch of batches) {
      const reservationIds = batch.map((row) => Number(row.reservationId));

      await this.runWithRetry(async () => {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          await queryRunner.manager
            .createQueryBuilder()
            .update(Reservation)
            .set({
              status: ReservationStatus.EXPIRED,
              expiredAt: now,
            })
            .where('id IN (:...ids)', { ids: reservationIds })
            .andWhere('status = :status', {
              status: ReservationStatus.RESERVED,
            })
            .execute();

          await queryRunner.manager
            .createQueryBuilder()
            .update(Slot)
            .set({
              isReserved: false,
              reservedByUserId: null,
            })
            .where(
              'id IN (SELECT reservation.slotId FROM reservations reservation WHERE reservation.id IN (:...ids) AND reservation.status = :status)',
              {
                ids: reservationIds,
                status: ReservationStatus.EXPIRED,
              },
            )
            .execute();

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      });

      const expiredReservations = await this.reservationRepository.find({
        where: {
          id: In(reservationIds),
          status: ReservationStatus.EXPIRED,
        },
      });

      expiredCount += expiredReservations.length;
      await Promise.all(
        expiredReservations.map(async (reservation) => {
          await this.firebaseService.sendNotification(reservation.userId, {
            type: NotificationType.RESERVATION_UPDATE,
            title: 'Reservation Expired',
            body: 'Your reservation was not confirmed in time and has been cancelled.',
          });

          await this.websocketService.broadcastToUser(
            reservation.userId,
            'reservation:expired',
            { reservationId: reservation.id },
          );
        }),
      );
    }

    return expiredCount;
  }

  private async sendReminderNotifications(now: Date): Promise<number> {
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60000);
    const games = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.schedule', 'schedule')
      .where('game.status = :status', { status: GameStatus.CREATED })
      .andWhere('schedule.reminderMinutesBefore IS NOT NULL')
      .andWhere('game.scheduledStartTime BETWEEN :now AND :windowEnd', {
        now,
        windowEnd,
      })
      .getMany();

    const gamesNeedingReminders: Map<number, number[]> = new Map();
    for (const game of games) {
      const reminders = game.schedule.reminderMinutesBefore || [];
      if (reminders.length === 0) {
        continue;
      }

      const dueReminders = reminders.filter((minutes) => {
        const reminderTime = new Date(game.scheduledStartTime);
        reminderTime.setUTCMinutes(reminderTime.getUTCMinutes() - minutes);
        const timeDiff = reminderTime.getTime() - now.getTime();
        return timeDiff > 0 && timeDiff < 60000;
      });

      if (dueReminders.length > 0) {
        gamesNeedingReminders.set(game.id, dueReminders);
      }
    }

    if (gamesNeedingReminders.size === 0) {
      return 0;
    }

    const gameIds = Array.from(gamesNeedingReminders.keys());
    const reservations = await this.reservationRepository.find({
      where: {
        gameId: In(gameIds),
        status: ReservationStatus.RESERVED,
      },
      relations: ['user'],
    });

    const notificationPromises: Array<Promise<void>> = [];
    let notificationCount = 0;

    for (const reservation of reservations) {
      const dueReminders = gamesNeedingReminders.get(reservation.gameId);
      if (!dueReminders) {
        continue;
      }

      for (const minutes of dueReminders) {
        notificationCount += 1;
        notificationPromises.push(
          this.firebaseService.sendNotification(reservation.userId, {
            type: NotificationType.CONFIRMATION_DEADLINE,
            title: 'Confirm Your Reservation',
            body: `Your reservation needs to be confirmed within ${minutes} minutes.`,
          }),
        );
      }
    }

    await Promise.all(notificationPromises);
    return notificationCount;
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  private async runWithRetry<T>(
    task: () => Promise<T>,
    attempts: number = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(error) || attempt === attempts) {
          throw error;
        }
        await this.delay(100 * attempt);
        this.logger.warn(
          `Retrying confirmation batch after transient DB error (attempt ${attempt})`,
        );
      }
    }
    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    const code =
      (error as { code?: string })?.code ||
      (error as { driverError?: { code?: string } })?.driverError?.code;
    return code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
