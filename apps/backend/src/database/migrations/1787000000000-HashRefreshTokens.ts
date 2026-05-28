import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Switches `refresh_tokens.token` from storing the plaintext JWT to storing its
 * SHA-256 hash (64-char hex), and adds a UNIQUE index on the digest.
 *
 * Existing rows hold plaintext tokens that (a) no longer validate once the app
 * looks up by hash and (b) exceed VARCHAR(64), so we purge them first. The only
 * effect for users is a one-time re-login after deploy — no real users exist in
 * pre-prod, and refresh tokens are short-lived anyway.
 */
export class HashRefreshTokens1787000000000 implements MigrationInterface {
  name = 'HashRefreshTokens1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Purge plaintext tokens — they can't match the new hash lookups and are
    // longer than the target column width.
    await queryRunner.query(`DELETE FROM \`refresh_tokens\``);
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` MODIFY \`token\` VARCHAR(64) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_refresh_tokens_token\` ON \`refresh_tokens\` (\`token\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Schema-only revert (hashed token values cannot be turned back into JWTs).
    await queryRunner.query(
      `DROP INDEX \`UQ_refresh_tokens_token\` ON \`refresh_tokens\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` MODIFY \`token\` TEXT NOT NULL`,
    );
  }
}
