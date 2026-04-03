import { NestExpressApplication } from '@nestjs/platform-express';
import { GameGenerationService } from '@/scheduler/game-generation.service';
import { Game } from '@/games/entities/game.entity';
import { Slot } from '@/games/entities/slot.entity';
import { createTestApp } from '../helpers/app';
import {
  destroyDataSource,
  getDataSource,
  runMigrations,
  truncateAllTables,
} from '../helpers/db';
import {
  createSchedule,
  createSlotConfigs,
  createUserWithWallet,
} from '../helpers/seed';

describe('GameGenerationService (integration)', () => {
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

  it('creates games with batch ids, indexes, and slots', async () => {
    const dataSource = await getDataSource();
    const { user } = await createUserWithWallet(dataSource, {
      isVerified: true,
    });
    const schedule = await createSchedule(dataSource, {
      createdBy: user.id,
      slotsPerGame: 4,
      gamesPerDay: 2,
      firstGameStartTime: '09:00',
    });
    await createSlotConfigs(dataSource, schedule.id, schedule.slotsPerGame);

    const generationService = app.get(GameGenerationService);
    const targetDate = new Date(2026, 0, 15);
    const count = await generationService.generateForSchedule(
      schedule,
      targetDate,
    );
    expect(count).toBe(2);

    const gameRepo = dataSource.getRepository(Game);
    const games = await gameRepo.find({
      where: { scheduleId: schedule.id },
      order: { gameIndex: 'ASC' },
    });
    expect(games).toHaveLength(2);
    expect(games[0].generationBatchId).toBe(games[1].generationBatchId);
    expect(games[0].gameIndex).toBe(1);
    expect(games[1].gameIndex).toBe(2);
    expect(games[0].scheduledStartTime.getHours()).toBe(9);
    expect(games[0].scheduledStartTime.getMinutes()).toBe(0);
    expect(games[1].scheduledStartTime.getMinutes()).toBe(30);

    const slotRepo = dataSource.getRepository(Slot);
    const slots = await slotRepo.find({
      where: { gameId: games[0].id },
    });
    expect(slots).toHaveLength(4);
  });
});
