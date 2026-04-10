import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventGenerationService } from './event-generation.service';
import { ConfirmationCheckerService } from './confirmation-checker.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly lockOwner = (() => {
    const host = process.env.HOSTNAME || 'unknown-host';
    return `${host}:${process.pid}`;
  })();
  private readonly lockTtlSeconds = (() => {
    const rawValue = Number.parseInt(
      process.env.SCHEDULER_LOCK_TTL_SECONDS || '1800',
      10,
    );
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 1800;
  })();

  // Cron execution status tracking
  public lastExecutionTime: Date | null = null;
  public lastExecutionStatus: 'success' | 'error' | null = null;
  public lastExecutionError: string | null = null;
  public executionCount: number = 0;

  constructor(
    private eventGenerationService: EventGenerationService,
    private confirmationCheckerService: ConfirmationCheckerService,
    private dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEventGeneration() {
    await this.withDbLock('scheduler:event_generation', 1, async () => {
      const startedAt = Date.now();
      this.logger.log('Starting scheduled event generation');
      this.lastExecutionTime = new Date();
      this.executionCount++;

      try {
        const { schedulesProcessed, gamesCreated } =
          await this.eventGenerationService.generateGames();
        this.lastExecutionStatus = 'success';
        this.lastExecutionError = null;
        this.logger.log(
          `Event generation completed successfully (schedules: ${schedulesProcessed}, games: ${gamesCreated}, durationMs: ${Date.now() - startedAt})`,
        );
      } catch (error) {
        this.lastExecutionStatus = 'error';
        this.lastExecutionError =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Event generation failed: ${this.lastExecutionError}`,
          error,
        );
      }
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReservationOpening() {
    await this.withDbLock('scheduler:reservation_opening', 1, async () => {
      const startedAt = Date.now();
      try {
        this.logger.log('Starting reservation opening check');
        const openedCount =
          await this.eventGenerationService.openGamesForReservation();
        if (openedCount > 0) {
          this.logger.log(
            `Reservation opening completed (games opened: ${openedCount}, durationMs: ${Date.now() - startedAt})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Reservation opening failed: ${error instanceof Error ? error.message : String(error)}`,
          error,
        );
      }
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleConfirmationCheck() {
    await this.withDbLock('scheduler:confirmation_check', 1, async () => {
      const startedAt = Date.now();
      try {
        this.logger.log('Starting scheduled confirmation check');
        const { expiredCount } =
          await this.confirmationCheckerService.checkConfirmations();
        this.logger.log(
          `Confirmation check completed successfully (expired: ${expiredCount}, durationMs: ${Date.now() - startedAt})`,
        );
      } catch (error) {
        this.logger.error(
          `Confirmation check failed: ${error instanceof Error ? error.message : String(error)}`,
          error,
        );
      }
    });
  }

  private async withDbLock(
    lockName: string,
    timeoutSeconds: number,
    task: () => Promise<void>,
  ): Promise<void> {
    const acquired = await this.tryAcquireLock(lockName, timeoutSeconds);
    if (!acquired) {
      this.logger.warn(`Skipping job; lock not acquired: ${lockName}`);
      return;
    }

    try {
      await task();
    } finally {
      await this.releaseLock(lockName);
    }
  }

  private async tryAcquireLock(
    lockName: string,
    timeoutSeconds: number,
  ): Promise<boolean> {
    await this.dataSource.query(
      'INSERT IGNORE INTO `scheduler_locks` (`name`, `locked_until`, `locked_by`, `updated_at`) VALUES (?, NOW(6), ?, NOW(6))',
      [lockName, this.lockOwner],
    );

    const timeoutMs = Math.max(0, timeoutSeconds) * 1000;
    const startTime = Date.now();
    const retryDelayMs = 200;

    while (true) {
      const result = await this.dataSource.query(
        'UPDATE `scheduler_locks` SET `locked_until` = DATE_ADD(NOW(6), INTERVAL ? SECOND), `locked_by` = ?, `updated_at` = NOW(6) WHERE `name` = ? AND `locked_until` <= NOW(6)',
        [this.lockTtlSeconds, this.lockOwner, lockName],
      );
      const affectedRows = this.getAffectedRows(result);
      if (affectedRows > 0) {
        return true;
      }

      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= timeoutMs) {
        return false;
      }

      await this.delay(Math.min(retryDelayMs, timeoutMs - elapsedMs));
    }
  }

  private async releaseLock(lockName: string): Promise<void> {
    await this.dataSource.query(
      'UPDATE `scheduler_locks` SET `locked_until` = NOW(6), `updated_at` = NOW(6) WHERE `name` = ? AND `locked_by` = ?',
      [lockName, this.lockOwner],
    );
  }

  private getAffectedRows(result: unknown): number {
    if (Array.isArray(result) && result.length > 0) {
      return this.getAffectedRows(result[0]);
    }

    if (typeof result === 'object' && result !== null) {
      const candidate = result as { affectedRows?: number };
      return Number(candidate.affectedRows ?? 0);
    }

    return 0;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      lastExecutionTime: this.lastExecutionTime,
      lastExecutionStatus: this.lastExecutionStatus,
      lastExecutionError: this.lastExecutionError,
      executionCount: this.executionCount,
    };
  }
}
