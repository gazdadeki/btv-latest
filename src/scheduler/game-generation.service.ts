import { Injectable } from '@nestjs/common';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SlotConfigService } from '../schedules/slot-config.service';
import { GamePreAssignmentService } from './game-pre-assignment.service';
import { GameBulkWriteService } from '../games/game-bulk-write.service';
import { WebsocketService } from '../websocket/websocket.service';
import { GamesBatchChangedPayload, WebsocketEvents } from '../websocket/events';
import { shouldEmitPerGameEvents } from '../games/bulk-game-event-mode';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GameGenerationService {
  constructor(
    private slotConfigService: SlotConfigService,
    private preAssignmentService: GamePreAssignmentService,
    private gameBulkWriteService: GameBulkWriteService,
    private websocketService: WebsocketService,
    private auditService: AuditService,
  ) {}

  async generateForSchedule(
    schedule: Schedule,
    targetDate: Date,
    adminId?: number,
  ): Promise<number> {
    const {
      createdGames,
      createdCount,
      cancelledCount,
      generationBatchId,
      correlationId,
    } = await this.gameBulkWriteService.generateGamesForScheduleDate(
      schedule,
      targetDate,
    );

    if (createdCount > 0) {
      const slotConfigs = schedule.slotConfigs?.length
        ? schedule.slotConfigs
        : await this.slotConfigService.findBySchedule(schedule.id);

      for (const game of createdGames) {
        await this.preAssignmentService.applyPreAssignments(
          game,
          slotConfigs,
          schedule,
        );
      }
    }

    if (createdCount > 0 || cancelledCount > 0) {
      const dateKey = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      )
        .toISOString()
        .split('T')[0];
      const action: GamesBatchChangedPayload['action'] =
        createdCount > 0 ? 'generated' : 'cancelled';
      const payload: GamesBatchChangedPayload = {
        action,
        scheduleId: schedule.id,
        date: dateKey,
        generationBatchId: generationBatchId || undefined,
        counts: {
          created: createdCount,
          cancelled: cancelledCount,
          updated: 0,
        },
        affectedGameIds:
          createdGames.length > 0 && createdGames.length <= 50
            ? createdGames.map((game) => game.id)
            : undefined,
      };
      this.websocketService.broadcastEnvelope(
        WebsocketEvents.GamesBatchChanged,
        payload,
        correlationId,
      );

      const shouldEmitGameCreatedEvents = shouldEmitPerGameEvents();
      if (shouldEmitGameCreatedEvents && createdCount > 0) {
        for (const game of createdGames) {
          this.websocketService.broadcast(WebsocketEvents.GameCreated, game);
        }
      }

      await this.auditService.log({
        userId: adminId ?? null,
        action:
          action === 'generated'
            ? 'GAMES_BATCH_GENERATED'
            : 'GAMES_BATCH_CANCELLED',
        entityType: 'GameBatch',
        entityId: generationBatchId || null,
        details: {
          scheduleId: schedule.id,
          date: dateKey,
          counts: payload.counts,
          correlationId,
        },
      });
    }

    return createdCount;
  }
}
