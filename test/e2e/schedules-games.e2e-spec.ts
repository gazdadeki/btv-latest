import { NestExpressApplication } from '@nestjs/platform-express';
import { UserRole } from '@/users/entities/user.entity';
import { createTestApp } from '../helpers/app';
import { createAgent, loginWithEmail } from '../helpers/http';
import {
  destroyDataSource,
  getDataSource,
  runMigrations,
  truncateAllTables,
} from '../helpers/db';
import { createUserWithWallet } from '../helpers/seed';

describe('Schedules + Games (e2e)', () => {
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

  it('creates schedules, generates games, and enforces lifecycle rules', async () => {
    const dataSource = await getDataSource();
    const { user, password } = await createUserWithWallet(dataSource, {
      role: UserRole.ADMIN,
      isVerified: true,
    });
    const agent = createAgent(app);
    await loginWithEmail(agent, user.email, password);

    const scheduleResponse = await agent
      .post('/api/v1/admin/schedules')
      .send({
        name: 'Schedule A',
        recurrenceType: 'WEEKLY',
        recurrenceDays: [1],
        slotsPerGame: 4,
        reservationCost: 100,
        confirmationWindowMinutes: 30,
        refundPolicy: 'NONE',
        firstGameStartTime: '10:00',
        teamAName: 'Team A',
        teamBName: 'Team B',
        gamesPerDay: 2,
        spacingAfterFinishMinutes: 30,
        isExclusiveToGold: false,
      })
      .expect(201);

    const scheduleId = scheduleResponse.body.id;

    await agent
      .post(`/api/v1/admin/schedules/${scheduleId}/generate-games`)
      .send({ date: new Date().toISOString() })
      .expect(201);

    const gamesResponse = await agent
      .get(`/api/v1/admin/games?scheduleId=${scheduleId}`)
      .expect(200);

    const games = gamesResponse.body.sort(
      (a: any, b: any) => (a.gameIndex || 0) - (b.gameIndex || 0),
    );
    expect(games).toHaveLength(2);

    await agent.put(`/api/v1/admin/games/${games[0].id}/start`).expect(200);
    await agent.put(`/api/v1/admin/games/${games[1].id}/start`).expect(400);

    const finishResponse = await agent
      .put(`/api/v1/admin/games/${games[0].id}/finish`)
      .send({ winningTeam: 'A' })
      .expect(200);
    expect(finishResponse.body.game.status).toBe('FINISHED');

    const cancelResponse = await agent
      .put(`/api/v1/admin/games/${games[1].id}/cancel`)
      .expect(200);
    expect(cancelResponse.body.status).toBe('CANCELLED');
  });
});
