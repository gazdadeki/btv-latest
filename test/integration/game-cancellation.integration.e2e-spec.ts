import { NestExpressApplication } from '@nestjs/platform-express';
import { GameCancellationService } from '@/games/game-cancellation.service';
import { Game, GameStatus } from '@/games/entities/game.entity';
import {
  Reservation,
  ReservationStatus,
} from '@/reservations/entities/reservation.entity';
import { Slot } from '@/games/entities/slot.entity';
import { Wallet } from '@/wallet/entities/wallet.entity';
import { RefundPolicy } from '@/schedules/entities/schedule.entity';
import { createTestApp } from '../helpers/app';
import {
  destroyDataSource,
  getDataSource,
  runMigrations,
  truncateAllTables,
} from '../helpers/db';
import {
  createGameWithSlots,
  createSchedule,
  createSlotConfigs,
  createUserWithWallet,
} from '../helpers/seed';

describe('GameCancellationService (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    await runMigrations();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await app.close();
    await destroyDataSource();
  });

  it('cancels created games and refunds reservations', async () => {
    const dataSource = await getDataSource();
    const { user, wallet } = await createUserWithWallet(dataSource, {
      balance: 300,
      isVerified: true,
    });
    const schedule = await createSchedule(dataSource, {
      createdBy: user.id,
      refundPolicy: RefundPolicy.FULL,
      reservationCost: 100,
      slotsPerGame: 2,
      gamesPerDay: 1,
      confirmationWindowMinutes: 30,
    });
    await createSlotConfigs(dataSource, schedule.id, schedule.slotsPerGame);
    const { game, slots } = await createGameWithSlots(dataSource, schedule, {
      scheduledStartTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    const reservationRepo = dataSource.getRepository(Reservation);
    const reservation = await reservationRepo.save(
      reservationRepo.create({
        slotId: slots[0].id,
        userId: user.id,
        gameId: game.id,
        status: ReservationStatus.RESERVED,
        reservationCostPaid: 100,
        confirmationCostPaid: 0,
        totalCostPaid: 100,
        discountApplied: 0,
        originalCost: 100,
        reservedAt: new Date(),
      }),
    );

    const slotRepo = dataSource.getRepository(Slot);
    const slot = await slotRepo.findOne({ where: { id: slots[0].id } });
    if (slot) {
      slot.isReserved = true;
      slot.reservedByUserId = user.id;
      await slotRepo.save(slot);
    }

    const walletRepo = dataSource.getRepository(Wallet);
    const walletAfterReserve = await walletRepo.findOne({
      where: { id: wallet.id },
    });
    expect(Number(walletAfterReserve?.balance)).toBe(300);

    const cancellationService = app.get(GameCancellationService);
    const cancelledCount =
      await cancellationService.cancelCreatedGamesForSchedule(schedule.id, {
        date: game.scheduledStartTime,
        audit: false,
        emitWebsocket: false,
      });
    expect(cancelledCount).toBe(1);

    const gameRepo = dataSource.getRepository(Game);
    const cancelledGame = await gameRepo.findOne({ where: { id: game.id } });
    expect(cancelledGame?.status).toBe(GameStatus.CANCELLED);

    const updatedReservation = await reservationRepo.findOne({
      where: { id: reservation.id },
    });
    expect(updatedReservation?.status).toBe(ReservationStatus.CANCELLED);

    const updatedSlot = await slotRepo.findOne({
      where: { id: slots[0].id },
    });
    expect(updatedSlot?.isReserved).toBe(false);

    const walletAfterRefund = await walletRepo.findOne({
      where: { id: wallet.id },
    });
    expect(Number(walletAfterRefund?.balance)).toBe(400);
  });
});
