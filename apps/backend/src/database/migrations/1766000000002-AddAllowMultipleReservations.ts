import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowMultipleReservations1766000000002 implements MigrationInterface {
  name = 'AddAllowMultipleReservations1766000000002';

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
