import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameUrl20251215183951 implements MigrationInterface {
  name = 'AddGameUrl20251215183951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD \`url\` varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`url\``);
  }
}
