import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUsernameRequired1743638500000 implements MigrationInterface {
  name = 'MakeUsernameRequired1743638500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fill any remaining null usernames with email prefix
    await queryRunner.query(
      `UPDATE \`users\` SET \`username\` = SUBSTRING_INDEX(\`email\`, '@', 1) WHERE \`username\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`username\` varchar(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`username\` varchar(255) NULL`,
    );
  }
}
