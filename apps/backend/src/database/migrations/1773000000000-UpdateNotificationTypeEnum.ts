import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationTypeEnum1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` MODIFY COLUMN \`type\` enum('STREAM_START','EVENT_REMINDER','CONFIRMATION_DEADLINE','SUBSCRIPTION_UPDATE','RESERVATION_UPDATE','ADMIN_ALERT','SCHEDULE_START','SCHEDULE_FINISHED','FIRST_GAME_START','GAME_START','LAST_GAME_START','FIRST_GAME_FINISH','GAME_FINISH','LAST_GAME_FINISH') NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` MODIFY COLUMN \`type\` enum('EVENT_REMINDER','CONFIRMATION_DEADLINE','SUBSCRIPTION_UPDATE','RESERVATION_UPDATE','ADMIN_ALERT','SCHEDULE_START','SCHEDULE_FINISHED','FIRST_GAME_START','GAME_START','LAST_GAME_START','FIRST_GAME_FINISH','GAME_FINISH','LAST_GAME_FINISH') NOT NULL`,
    );
  }
}
