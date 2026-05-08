import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed initial avatar catalog. Files live in apps/backend/public/avatars/ and
 * are served at /avatars/<filename> by the backend's static handler.
 *
 * Initial set: 4 FREE placeholders + 1 ADMIN placeholder. GOLD tier is left
 * empty until real art ships — add rows via a future migration.
 */
export class SeedInitialAvatars1778000000000 implements MigrationInterface {
  name = 'SeedInitialAvatars1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`avatars\` (\`key\`, \`filename\`, \`tier\`, \`displayName\`, \`sortOrder\`, \`isActive\`) VALUES ` +
        `('free-01', 'avatar-example.png', 'FREE', 'Classic 1', 10, 1), ` +
        `('free-02', 'avatar-example-2.png', 'FREE', 'Classic 2', 20, 1), ` +
        `('free-03', 'avatar-example-3.png', 'FREE', 'Classic 3', 30, 1), ` +
        `('free-04', 'avatar-example-4.png', 'FREE', 'Classic 4', 40, 1), ` +
        `('admin-01', 'avatar-example-5.png', 'ADMIN', 'Streamer', 10, 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`avatars\` WHERE \`key\` IN ('free-01','free-02','free-03','free-04','admin-01')`,
    );
  }
}
