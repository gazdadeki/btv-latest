import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyScheduleFields1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add requiresConfirmation to schedules (default false — no confirmation needed)
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`requiresConfirmation\` tinyint NOT NULL DEFAULT 0`,
    );

    // Add url to streams (moved from schedules)
    await queryRunner.query(
      `ALTER TABLE \`streams\` ADD COLUMN \`url\` varchar(500) NULL`,
    );

    // Drop unused schedule columns
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`spacingAfterFinishMinutes\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`autoStartNextAfterMinutes\``,
    );
    await queryRunner.query(`ALTER TABLE \`schedules\` DROP COLUMN \`url\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore dropped columns
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`url\` varchar(500) NULL DEFAULT 'https://youtube.com'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`autoStartNextAfterMinutes\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`spacingAfterFinishMinutes\` int NULL`,
    );

    // Remove added columns
    await queryRunner.query(`ALTER TABLE \`streams\` DROP COLUMN \`url\``);
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`requiresConfirmation\``,
    );
  }
}
