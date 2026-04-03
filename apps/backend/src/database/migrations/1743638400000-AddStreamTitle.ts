import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreamTitle1743638400000 implements MigrationInterface {
  name = 'AddStreamTitle1743638400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`streams\` ADD \`title\` varchar(255) NULL AFTER \`status\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`streams\` DROP COLUMN \`title\``);
  }
}
