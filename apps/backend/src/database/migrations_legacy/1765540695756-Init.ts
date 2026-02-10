import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765540695756 implements MigrationInterface {
  name = 'Init1765540695756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`confirmationCost\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`eventDurationMinutes\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`instantReservationCost\` decimal(10,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`events\` CHANGE \`durationMinutes\` \`durationMinutes\` int NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`events\` CHANGE \`durationMinutes\` \`durationMinutes\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`instantReservationCost\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`eventDurationMinutes\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`confirmationCost\` decimal NOT NULL`,
    );
  }
}
