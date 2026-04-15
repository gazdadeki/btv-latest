import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlotIsGoldOnly1774000000000 implements MigrationInterface {
  name = 'AddSlotIsGoldOnly1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`slots\` ADD \`isGoldOnly\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`slots\` DROP COLUMN \`isGoldOnly\``);
  }
}
