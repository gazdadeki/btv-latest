import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowReusedUsernameAfterVoid1785000000000 implements MigrationInterface {
  name = 'AllowReusedUsernameAfterVoid1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP INDEX \`UQ_users_username\``,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_username\` ON \`users\` (\`username\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_users_username\` ON \`users\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD UNIQUE INDEX \`UQ_users_username\` (\`username\`)`,
    );
  }
}
