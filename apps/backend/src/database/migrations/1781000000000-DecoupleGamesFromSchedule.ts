import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Decouple games from schedule: drop games.scheduleId, make games.streamId NOT NULL.
 *
 * Games now belong to a Stream (the streaming session), which in turn belongs
 * to a Schedule. This eliminates redundant lineage and lets a stream's session
 * span midnight without splitting its games across calendar days.
 *
 * Pre-condition: the games table must be empty (or every row must already have
 * a non-null streamId). The auth-flow dev cleanup truncated the table on
 * 2026-05-12 before this migration runs, so this is satisfied locally.
 */
export class DecoupleGamesFromSchedule1781000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: refuse to run if any games row still has a null streamId. Better
    // to fail loudly than silently break the NOT NULL invariant.
    const orphans: Array<{ count: number }> = await queryRunner.query(
      'SELECT COUNT(*) AS count FROM `games` WHERE `streamId` IS NULL',
    );
    if (orphans[0]?.count > 0) {
      throw new Error(
        `DecoupleGamesFromSchedule: ${orphans[0].count} game(s) have streamId=NULL. ` +
          'Backfill or delete them before running this migration.',
      );
    }

    // Drop scheduleId FK + index + column
    await queryRunner.query(
      'ALTER TABLE `games` DROP FOREIGN KEY `FK_games_scheduleId`',
    );
    await queryRunner.query(
      'ALTER TABLE `games` DROP INDEX `IDX_games_scheduleId`',
    );
    await queryRunner.query('ALTER TABLE `games` DROP COLUMN `scheduleId`');

    // Make streamId NOT NULL (was nullable when streams were introduced)
    await queryRunner.query(
      'ALTER TABLE `games` MODIFY COLUMN `streamId` int NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert streamId to nullable
    await queryRunner.query(
      'ALTER TABLE `games` MODIFY COLUMN `streamId` int NULL',
    );

    // Restore scheduleId column + index + FK (best-effort; backfill is on caller)
    await queryRunner.query(
      'ALTER TABLE `games` ADD COLUMN `scheduleId` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `games` ADD INDEX `IDX_games_scheduleId` (`scheduleId`)',
    );
    await queryRunner.query(
      'ALTER TABLE `games` ADD CONSTRAINT `FK_games_scheduleId` ' +
        'FOREIGN KEY (`scheduleId`) REFERENCES `schedules`(`id`) ' +
        'ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
