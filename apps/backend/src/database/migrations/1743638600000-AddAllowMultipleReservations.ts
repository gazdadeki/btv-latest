import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowMultipleReservations1743638600000 implements MigrationInterface {
  name = 'AddAllowMultipleReservations1743638600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD \`allowMultipleReservations\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`games\` DROP COLUMN \`allowMultipleReservations\``,
    );
  }
}
