import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-tier the seeded avatars: avatar-example-3/4/5 become GOLD (were FREE/ADMIN
 * in the initial seed). The admin streamer avatar is seeded separately once
 * its final art is ready. UPDATEs preserve IDs so any user.avatarId FKs stay
 * valid.
 */
export class RetierSeedAvatars1779000000000 implements MigrationInterface {
  name = 'RetierSeedAvatars1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`avatars\` SET \`tier\` = 'GOLD', \`key\` = 'gold-01', \`displayName\` = 'Gold 1', \`sortOrder\` = 10 WHERE \`key\` = 'free-03'`,
    );
    await queryRunner.query(
      `UPDATE \`avatars\` SET \`tier\` = 'GOLD', \`key\` = 'gold-02', \`displayName\` = 'Gold 2', \`sortOrder\` = 20 WHERE \`key\` = 'free-04'`,
    );
    await queryRunner.query(
      `UPDATE \`avatars\` SET \`tier\` = 'GOLD', \`key\` = 'gold-03', \`displayName\` = 'Gold 3', \`sortOrder\` = 30 WHERE \`key\` = 'admin-01'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`avatars\` SET \`tier\` = 'FREE', \`key\` = 'free-03', \`displayName\` = 'Classic 3', \`sortOrder\` = 30 WHERE \`key\` = 'gold-01'`,
    );
    await queryRunner.query(
      `UPDATE \`avatars\` SET \`tier\` = 'FREE', \`key\` = 'free-04', \`displayName\` = 'Classic 4', \`sortOrder\` = 40 WHERE \`key\` = 'gold-02'`,
    );
    await queryRunner.query(
      `UPDATE \`avatars\` SET \`tier\` = 'ADMIN', \`key\` = 'admin-01', \`displayName\` = 'Streamer', \`sortOrder\` = 10 WHERE \`key\` = 'gold-03'`,
    );
  }
}
