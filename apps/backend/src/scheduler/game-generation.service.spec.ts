import { GameGenerationService } from './game-generation.service';
import { Schedule } from '../schedules/entities/schedule.entity';

describe('GameGenerationService', () => {
  it('applies preassignments and emits batch events', async () => {
    const slotConfigService = {
      findBySchedule: jest.fn().mockResolvedValue([]),
    };
    const preAssignmentService = {
      applyPreAssignments: jest.fn().mockResolvedValue(undefined),
    };
    const gameBulkWriteService = {
      generateGamesForScheduleDate: jest.fn().mockResolvedValue({
        createdGames: [{ id: 1 }, { id: 2 }],
        createdCount: 2,
        cancelledCount: 0,
        generationBatchId: 'batch-123',
        correlationId: 'corr-123',
      }),
    };
    const websocketService = {
      broadcast: jest.fn(),
      broadcastEnvelope: jest.fn(),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const service = new GameGenerationService(
      slotConfigService as any,
      preAssignmentService as any,
      gameBulkWriteService as any,
      websocketService as any,
      auditService as any,
    );

    const schedule = {
      id: 12,
      firstGameStartTime: '10:00',
      gamesPerDay: 2,
      slotsPerGame: 10,
      teamAName: 'Sentinel',
      teamBName: 'Scourge',
      isExclusiveToGold: false,
      slotConfigs: [],
    } as Schedule;

    const targetDate = new Date(2026, 0, 15);
    const createdCount = await service.generateForSchedule(
      schedule,
      targetDate,
    );

    expect(createdCount).toBe(2);
    expect(preAssignmentService.applyPreAssignments).toHaveBeenCalledTimes(2);
    expect(websocketService.broadcastEnvelope).toHaveBeenCalledTimes(1);
  });

  it('returns 0 when no games are created or cancelled', async () => {
    const slotConfigService = {
      findBySchedule: jest.fn().mockResolvedValue([]),
    };
    const preAssignmentService = {
      applyPreAssignments: jest.fn().mockResolvedValue(undefined),
    };
    const gameBulkWriteService = {
      generateGamesForScheduleDate: jest.fn().mockResolvedValue({
        createdGames: [],
        createdCount: 0,
        cancelledCount: 0,
        generationBatchId: null,
        correlationId: 'corr-0',
      }),
    };
    const websocketService = {
      broadcast: jest.fn(),
      broadcastEnvelope: jest.fn(),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const service = new GameGenerationService(
      slotConfigService as any,
      preAssignmentService as any,
      gameBulkWriteService as any,
      websocketService as any,
      auditService as any,
    );

    const schedule = {
      id: 99,
      firstGameStartTime: '10:00',
      gamesPerDay: 1,
      slotsPerGame: 10,
      teamAName: 'Sentinel',
      teamBName: 'Scourge',
      isExclusiveToGold: false,
      slotConfigs: [],
    } as Schedule;

    const targetDate = new Date(2026, 0, 15);
    const createdCount = await service.generateForSchedule(
      schedule,
      targetDate,
    );

    expect(createdCount).toBe(0);
    expect(preAssignmentService.applyPreAssignments).not.toHaveBeenCalled();
    expect(websocketService.broadcastEnvelope).not.toHaveBeenCalled();
  });
});
