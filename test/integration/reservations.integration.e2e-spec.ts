import { NestExpressApplication } from '@nestjs/platform-express';
import { ReservationsService } from '@/reservations/reservations.service';
import {
  Reservation,
  ReservationStatus,
} from '@/reservations/entities/reservation.entity';
import { Wallet } from '@/wallet/entities/wallet.entity';
import { Slot } from '@/games/entities/slot.entity';
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

describe('ReservationsService (integration)', () => {
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

  it('creates, confirms, and cancels a reservation with refunds', async () => {
    const dataSource = await getDataSource();
    const { user, wallet } = await createUserWithWallet(dataSource, {
      balance: 500,
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

    const reservationsService = app.get(ReservationsService);
    const reservation = await reservationsService.create(
      user.id,
      game.id,
      slots[0].id,
      slots[0].team,
      false,
      false,
    );

    const walletRepo = dataSource.getRepository(Wallet);
    const walletAfterReserve = await walletRepo.findOne({
      where: { id: wallet.id },
    });
    expect(Number(walletAfterReserve?.balance)).toBe(400);

    const confirmed = await reservationsService.confirm(
      reservation.id,
      user.id,
    );
    expect(confirmed.status).toBe(ReservationStatus.CONFIRMED);

    await reservationsService.cancel(reservation.id, user.id);

    const reservationRepo = dataSource.getRepository(Reservation);
    const cancelled = await reservationRepo.findOne({
      where: { id: reservation.id },
    });
    expect(cancelled?.status).toBe(ReservationStatus.CANCELLED);

    const slotRepo = dataSource.getRepository(Slot);
    const slot = await slotRepo.findOne({ where: { id: slots[0].id } });
    expect(slot?.isReserved).toBe(false);

    const walletAfterRefund = await walletRepo.findOne({
      where: { id: wallet.id },
    });
    expect(Number(walletAfterRefund?.balance)).toBe(500);
  });
});
