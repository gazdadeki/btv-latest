import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforces "at most one ACTIVE account per username" at the database level,
 * the backstop the plain index from AllowReusedUsernameAfterVoid lacks.
 *
 * MySQL has no partial/filtered unique index, so we emulate one with a STORED
 * generated column: it holds the username for active (non-voided) users and
 * NULL for voided ones. A unique index over it collides on two active rows
 * sharing a username, while any number of voided rows (all NULL — MySQL treats
 * NULLs as distinct) may keep the username for reuse.
 */
export class EnforceSingleActiveUsername1786000000000 implements MigrationInterface {
  name = 'EnforceSingleActiveUsername1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`usernameActive\` varchar(255) ` +
        `GENERATED ALWAYS AS (CASE WHEN \`voidedAt\` IS NULL THEN \`username\` ELSE NULL END) STORED`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_users_username_active\` ON \`users\` (\`usernameActive\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`UQ_users_username_active\` ON \`users\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`usernameActive\``,
    );
  }
}
