import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765542306512 implements MigrationInterface {
  name = 'Init1765542306512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`url\` varchar(500) NULL DEFAULT 'https://youtube.com'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` CHANGE \`type\` \`type\` enum ('EVENT_REMINDER', 'CONFIRMATION_DEADLINE', 'SUBSCRIPTION_UPDATE', 'RESERVATION_UPDATE', 'ADMIN_ALERT', 'SCHEDULE_START', 'SCHEDULE_FINISHED') NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` CHANGE \`type\` \`type\` enum ('EVENT_REMINDER', 'CONFIRMATION_DEADLINE', 'SUBSCRIPTION_UPDATE', 'RESERVATION_UPDATE', 'ADMIN_ALERT') NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`schedules\` DROP COLUMN \`url\``);
  }
}
