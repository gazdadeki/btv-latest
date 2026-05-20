import { MigrationInterface, QueryRunner } from 'typeorm';

export class TutorialCategoryManyToOne1783000000000 implements MigrationInterface {
  name = 'TutorialCategoryManyToOne1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tutorial_categories\``);
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` ADD \`categoryId\` int NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_tutorials_categoryId\` ON \`tutorials\` (\`categoryId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` ADD CONSTRAINT \`FK_tutorials_categoryId\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` DROP FOREIGN KEY \`FK_tutorials_categoryId\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_tutorials_categoryId\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` DROP COLUMN \`categoryId\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorial_categories\` (
        \`tutorialId\` int NOT NULL,
        \`categoryId\` int NOT NULL,
        PRIMARY KEY (\`tutorialId\`, \`categoryId\`),
        INDEX \`IDX_tutorial_categories_categoryId\` (\`categoryId\`)
      ) ENGINE=InnoDB`,
    );
  }
}
