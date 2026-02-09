import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeIndexes1767000000000 implements MigrationInterface {
  name = 'AddCompositeIndexes1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `IDX_reservations_game_status` ON `reservations` (`gameId`, `status`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_reservations_user_status` ON `reservations` (`userId`, `status`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_slots_game_team_reserved` ON `slots` (`gameId`, `team`, `isReserved`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_transactions_wallet_created_at` ON `transactions` (`walletId`, `createdAt`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_games_schedule_start_time` ON `games` (`scheduleId`, `scheduledStartTime`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_games_schedule_start_time` ON `games`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_transactions_wallet_created_at` ON `transactions`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_slots_game_team_reserved` ON `slots`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_reservations_user_status` ON `reservations`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_reservations_game_status` ON `reservations`',
    );
  }
}
