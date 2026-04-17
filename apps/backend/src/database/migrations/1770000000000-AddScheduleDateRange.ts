import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleDateRange1770000000000 implements MigrationInterface {
  name = 'AddScheduleDateRange1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`scheduleStartDate\` date NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`scheduleEndDate\` date NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`scheduleEndDate\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`scheduleStartDate\``,
    );
  }
}
