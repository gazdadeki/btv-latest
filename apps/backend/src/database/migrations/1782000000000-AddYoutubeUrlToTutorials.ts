import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYoutubeUrlToTutorials1782000000000 implements MigrationInterface {
  name = 'AddYoutubeUrlToTutorials1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` ADD \`youtubeUrl\` varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` DROP COLUMN \`youtubeUrl\``,
    );
  }
}
