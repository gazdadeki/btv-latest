import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameCreationAndReservationTimes1769000000000 implements MigrationInterface {
  name = 'AddGameCreationAndReservationTimes1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`gameCreationTime\` time NOT NULL DEFAULT '06:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD COLUMN \`reservationOpenTime\` time NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` MODIFY COLUMN \`status\` enum('CREATED','OPEN','IN_PROGRESS','FINISHED','CANCELLED') NOT NULL DEFAULT 'CREATED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`games\` MODIFY COLUMN \`status\` enum('CREATED','IN_PROGRESS','FINISHED','CANCELLED') NOT NULL DEFAULT 'CREATED'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`reservationOpenTime\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`gameCreationTime\``,
    );
  }
}
