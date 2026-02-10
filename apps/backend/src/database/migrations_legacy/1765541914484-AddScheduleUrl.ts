import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleUrl1765541914484 implements MigrationInterface {
  name = 'AddScheduleUrl1765541914484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`url\` varchar(500) NULL DEFAULT 'https://youtube.com'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`schedules\` DROP COLUMN \`url\``);
  }
}
