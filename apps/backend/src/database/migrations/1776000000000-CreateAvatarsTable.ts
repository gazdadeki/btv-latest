import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvatarsTable1776000000000 implements MigrationInterface {
  name = 'CreateAvatarsTable1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`avatars\` (` +
        `\`id\` int NOT NULL AUTO_INCREMENT, ` +
        `\`key\` varchar(64) NOT NULL, ` +
        `\`filename\` varchar(128) NOT NULL, ` +
        `\`tier\` enum ('FREE', 'GOLD', 'ADMIN') NOT NULL, ` +
        `\`displayName\` varchar(64) NULL, ` +
        `\`sortOrder\` int NOT NULL DEFAULT 0, ` +
        `\`isActive\` tinyint NOT NULL DEFAULT 1, ` +
        `\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
        `\`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ` +
        `UNIQUE INDEX \`UQ_avatars_key\` (\`key\`), ` +
        `INDEX \`IDX_avatars_tier\` (\`tier\`), ` +
        `INDEX \`IDX_avatars_isActive\` (\`isActive\`), ` +
        `PRIMARY KEY (\`id\`)` +
        `) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`avatars\``);
  }
}
