import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765736987265 implements MigrationInterface {
  name = 'Init1765736987265';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`deletedAt\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD \`deletedBy\` int NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_73a638854eafb90a9ec9d5d871\` ON \`schedules\` (\`deletedAt\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_73a638854eafb90a9ec9d5d871\` ON \`schedules\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`deletedBy\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP COLUMN \`deletedAt\``,
    );
  }
}
