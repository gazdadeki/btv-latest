import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreamTitle1771000000001 implements MigrationInterface {
  name = 'AddStreamTitle1771000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`streams\` ADD \`title\` varchar(255) NULL AFTER \`status\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`streams\` DROP COLUMN \`title\``);
  }
}
