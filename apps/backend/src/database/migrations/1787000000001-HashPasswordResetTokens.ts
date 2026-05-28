import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Switches `password_reset_tokens.token` from storing the plaintext token to
 * storing its SHA-256 hash (64-char hex), matching the refresh-token hashing.
 *
 * Existing rows hold plaintext tokens that no longer validate once the app looks
 * up by hash, so we purge them first. The only effect is that any in-flight reset
 * link issued before deploy stops working — the user simply requests a new one.
 */
export class HashPasswordResetTokens1787000000001 implements MigrationInterface {
  name = 'HashPasswordResetTokens1787000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Purge plaintext tokens — they can't match the new hash lookups.
    await queryRunner.query(`DELETE FROM \`password_reset_tokens\``);
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` MODIFY \`token\` VARCHAR(64) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Schema-only revert (hashed token values cannot be turned back into plaintext).
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` MODIFY \`token\` VARCHAR(255) NOT NULL`,
    );
  }
}
