import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreams1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`streams\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`scheduleId\` int NOT NULL,
        \`status\` enum('PENDING','LIVE','ENDED') NOT NULL DEFAULT 'PENDING',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_streams_status\` (\`status\`),
        INDEX \`IDX_streams_scheduleId\` (\`scheduleId\`),
        CONSTRAINT \`FK_streams_scheduleId\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(
      `ALTER TABLE \`games\` ADD COLUMN \`streamId\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD INDEX \`IDX_games_streamId\` (\`streamId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD CONSTRAINT \`FK_games_streamId\` FOREIGN KEY (\`streamId\`) REFERENCES \`streams\`(\`id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`games\` DROP FOREIGN KEY \`FK_games_streamId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` DROP INDEX \`IDX_games_streamId\``,
    );
    await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`streamId\``);
    await queryRunner.query(`DROP TABLE \`streams\``);
  }
}
