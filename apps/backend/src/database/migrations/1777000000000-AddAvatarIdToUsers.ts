import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarIdToUsers1777000000000 implements MigrationInterface {
  name = 'AddAvatarIdToUsers1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` ADD \`avatarId\` int NULL`);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_users_avatarId\` ` +
        `FOREIGN KEY (\`avatarId\`) REFERENCES \`avatars\`(\`id\`) ` +
        `ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_avatarId\``,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`avatarId\``);
  }
}
