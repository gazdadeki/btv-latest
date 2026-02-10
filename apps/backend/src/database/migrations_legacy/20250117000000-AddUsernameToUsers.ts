import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameToUsers20250117000000 implements MigrationInterface {
  name = 'AddUsernameToUsers20250117000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`username\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_users_username\` ON \`users\` (\`username\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_users_username\` ON \`users\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`username\``);
  }
}
