import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { Slot, Team } from './entities/slot.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SlotConfig } from '../schedules/entities/slot-config.entity';
import { SlotConfigService } from '../schedules/slot-config.service';
import { GameCancellationService } from './game-cancellation.service';
import { utcStartOfDay, utcEndOfDay } from '../common/date.utils';

export interface BulkGenerationResult {
  createdGames: Game[];
  createdCount: number;
  cancelledCount: number;
  generationBatchId: string | null;
  correlationId: string;
}

@Injectable()
export class GameBulkWriteService {
  constructor(
    private dataSource: DataSource,
    private slotConfigService: SlotConfigService,
    private gameCancellationService: GameCancellationService,
  ) {}

  async generateGamesForScheduleDate(
    schedule: Schedule,
    targetDate: Date,
    forceRegenerate = false,
  ): Promise<BulkGenerationResult> {
    const correlationId = randomUUID();
    const normalizedDate = utcStartOfDay(targetDate);

    let cancelledCount = 0;

    const slotConfigs =
      schedule.slotConfigs?.length > 0
        ? schedule.slotConfigs
        : await this.slotConfigService.findBySchedule(schedule.id);

    const { createdGames, generationBatchId } =
      await this.dataSource.transaction(async (manager) => {
        await manager.findOne(Schedule, {
          where: { id: schedule.id },
          lock: { mode: 'pessimistic_write' },
        });

        const hasActiveGames = await this.hasActiveGamesForDate(
          manager,
          schedule.id,
          normalizedDate,
        );
        if (hasActiveGames) {
          if (!forceRegenerate) {
            return { createdGames: [], generationBatchId: null };
          }
          // Admin-triggered regeneration: cancel existing CREATED games first
          cancelledCount =
            await this.gameCancellationService.cancelCreatedGamesForSchedule(
              schedule.id,
              {
                date: normalizedDate,
                audit: false,
                emitWebsocket: false,
                reason: 'Cancelled before regenerating games for schedule date',
              },
            );
          // If OPEN/IN_PROGRESS games remain after cancelling CREATED ones, skip to avoid duplicates
          const stillHasActiveGames = await this.hasActiveGamesForDate(
            manager,
            schedule.id,
            normalizedDate,
          );
          if (stillHasActiveGames) {
            return { createdGames: [], generationBatchId: null };
          }
        }

        const generationBatchId = randomUUID();
        const [hours, minutes] = schedule.firstGameStartTime
          .split(':')
          .map(Number);
        const baseStartTime = new Date(normalizedDate);
        baseStartTime.setUTCHours(hours, minutes, 0, 0);

        const gamesToCreate: Game[] = [];
        for (let i = 0; i < schedule.gamesPerDay; i += 1) {
          const gameStartTime = new Date(baseStartTime);
          if (i > 0 && schedule.spacingAfterFinishMinutes) {
            gameStartTime.setUTCMinutes(
              gameStartTime.getUTCMinutes() +
                i * schedule.spacingAfterFinishMinutes,
            );
          }

          // If no reservationOpenTime is set, games open for reservations immediately.
          const initialStatus = schedule.reservationOpenTime
            ? GameStatus.CREATED
            : GameStatus.OPEN;

          gamesToCreate.push(
            manager.create(Game, {
              scheduleId: schedule.id,
              status: initialStatus,
              scheduledStartTime: gameStartTime,
              teamAName: schedule.teamAName,
              teamBName: schedule.teamBName,
              isExclusiveToGold: schedule.isExclusiveToGold,
              url: schedule.url || null,
              generationBatchId,
              gameIndex: i + 1,
            }),
          );
        }

        const createdGames = await manager.save(Game, gamesToCreate);
        const slotsToCreate: Slot[] = [];
        for (const game of createdGames) {
          slotsToCreate.push(
            ...this.buildSlotsForGame(
              manager,
              game,
              slotConfigs,
              schedule.slotsPerGame,
            ),
          );
        }
        if (slotsToCreate.length > 0) {
          await manager.save(Slot, slotsToCreate);
        }

        return { createdGames, generationBatchId };
      });

    return {
      createdGames,
      createdCount: createdGames.length,
      cancelledCount,
      generationBatchId,
      correlationId,
    };
  }

  private buildSlotsForGame(
    manager: EntityManager,
    game: Game,
    slotConfigs: SlotConfig[],
    slotsPerGame: number,
  ): Slot[] {
    if (slotConfigs.length > 0) {
      return slotConfigs.map((config) => {
        const hasPreAssignedUser = !!config.preAssignedUserId;
        return manager.create(Slot, {
          gameId: game.id,
          slotNumber: config.slotNumber,
          team: config.team,
          isReserved: hasPreAssignedUser,
          reservedByUserId: config.preAssignedUserId || null,
          isPreAssigned: hasPreAssignedUser,
          preAssignedUserId: config.preAssignedUserId || null,
        });
      });
    }

    const slots: Slot[] = [];
    const slotsPerTeam = slotsPerGame / 2;
    for (let i = 1; i <= slotsPerGame; i += 1) {
      slots.push(
        manager.create(Slot, {
          gameId: game.id,
          slotNumber: i,
          team: i <= slotsPerTeam ? Team.A : Team.B,
          isReserved: false,
        }),
      );
    }
    return slots;
  }

  private async hasActiveGamesForDate(
    manager: EntityManager,
    scheduleId: number,
    targetDate: Date,
  ): Promise<boolean> {
    const { start, end } = this.getDateBounds(targetDate);
    const count = await manager
      .createQueryBuilder(Game, 'game')
      .where('game.scheduleId = :scheduleId', { scheduleId })
      .andWhere('game.status != :cancelled', {
        cancelled: GameStatus.CANCELLED,
      })
      .andWhere('game.scheduledStartTime BETWEEN :start AND :end', {
        start,
        end,
      })
      .getCount();

    return count > 0;
  }

  private getDateBounds(date: Date): { start: Date; end: Date } {
    return { start: utcStartOfDay(date), end: utcEndOfDay(date) };
  }
}
