import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTutorialFeatured1784000000000 implements MigrationInterface {
  name = 'RemoveTutorialFeatured1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_tutorials_featured\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` DROP COLUMN \`featured\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` ADD \`featured\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_tutorials_featured\` ON \`tutorials\` (\`featured\`)`,
    );
  }
}
