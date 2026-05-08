import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed the admin-tier avatar (balta-avatar.png) and assign it to the default
 * admin user (admin1@baltazartv.app) since no admin-side picker UI exists yet.
 * Safe if the admin user doesn't exist (the UPDATE just affects zero rows).
 */
export class SeedAdminAvatar1780000000000 implements MigrationInterface {
  name = 'SeedAdminAvatar1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`avatars\` (\`key\`, \`filename\`, \`tier\`, \`displayName\`, \`sortOrder\`, \`isActive\`) VALUES ` +
        `('admin-01', 'balta-avatar.png', 'ADMIN', 'Balta', 10, 1)`,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`avatarId\` = (SELECT \`id\` FROM \`avatars\` WHERE \`key\` = 'admin-01') WHERE \`email\` = 'admin1@baltazartv.app'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`users\` SET \`avatarId\` = NULL WHERE \`avatarId\` = (SELECT \`id\` FROM \`avatars\` WHERE \`key\` = 'admin-01')`,
    );
    await queryRunner.query(
      `DELETE FROM \`avatars\` WHERE \`key\` = 'admin-01'`,
    );
  }
}
