import { NestExpressApplication } from '@nestjs/platform-express';
import { createTestApp } from '../helpers/app';
import { createAgent, loginWithEmail } from '../helpers/http';
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

describe('Player reservations (e2e)', () => {
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

  it('lists games, reserves a slot, confirms, and cancels', async () => {
    const dataSource = await getDataSource();
    const { user, password } = await createUserWithWallet(dataSource, {
      balance: 500,
      isVerified: true,
    });
    const schedule = await createSchedule(dataSource, {
      createdBy: user.id,
      slotsPerGame: 4,
      gamesPerDay: 1,
      reservationCost: 50,
      confirmationWindowMinutes: 30,
    });
    await createSlotConfigs(dataSource, schedule.id, schedule.slotsPerGame);
    const { game, slots } = await createGameWithSlots(dataSource, schedule, {
      scheduledStartTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    const agent = createAgent(app);
    await loginWithEmail(agent, user.email, password);

    const gamesResponse = await agent
      .get('/api/v1/players/games/available')
      .expect(200);
    expect(gamesResponse.body.some((g: any) => g.id === game.id)).toBe(true);

    const slotsResponse = await agent
      .get(`/api/v1/players/games/${game.id}/slots`)
      .expect(200);
    const targetSlot = slotsResponse.body.find(
      (slot: any) => slot.id === slots[0].id,
    );
    expect(targetSlot.isReserved).toBe(false);

    const reserveResponse = await agent
      .post(`/api/v1/players/games/${game.id}/slots/${slots[0].id}/reserve`)
      .send({ team: slots[0].team })
      .expect(201);
    expect(reserveResponse.body.status).toBe('RESERVED');

    const confirmResponse = await agent
      .post(`/api/v1/players/reservations/${reserveResponse.body.id}/confirm`)
      .expect(201);
    expect(confirmResponse.body.status).toBe('CONFIRMED');

    await agent
      .delete(`/api/v1/players/reservations/${reserveResponse.body.id}`)
      .expect(200);

    const updatedSlotsResponse = await agent
      .get(`/api/v1/players/games/${game.id}/slots`)
      .expect(200);
    const updatedSlot = updatedSlotsResponse.body.find(
      (slot: any) => slot.id === slots[0].id,
    );
    expect(updatedSlot.isReserved).toBe(false);

    const reservationsResponse = await agent
      .get('/api/v1/players/reservations/my')
      .expect(200);
    const reservation = reservationsResponse.body.find(
      (r: any) => r.id === reserveResponse.body.id,
    );
    expect(reservation.status).toBe('CANCELLED');
  });
});
