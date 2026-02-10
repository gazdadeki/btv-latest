import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765746677837 implements MigrationInterface {
  name = 'Init1765746677837';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`slots\` DROP FOREIGN KEY \`FK_665c6a54ef9c49866a7bfa21bcd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` DROP FOREIGN KEY \`FK_c6fda79964e4d3a3e3f9843fbc1\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_665c6a54ef9c49866a7bfa21bc\` ON \`slots\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c6fda79964e4d3a3e3f9843fbc\` ON \`reservations\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` CHANGE \`eventId\` \`gameId\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` CHANGE \`eventId\` \`gameId\` int NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE \`games\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduleId\` int NOT NULL, \`status\` enum ('CREATED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'CREATED', \`scheduledStartTime\` datetime NOT NULL, \`actualStartTime\` datetime NULL, \`actualEndTime\` datetime NULL, \`durationMinutes\` int NULL, \`teamAName\` varchar(255) NOT NULL, \`teamBName\` varchar(255) NOT NULL, \`isExclusiveToGold\` tinyint NOT NULL DEFAULT 0, \`winningTeam\` enum ('A', 'B') NULL, \`mvpUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_1ddf76422912e354a05479bcce\` (\`scheduledStartTime\`), INDEX \`IDX_05318b3cbff2443bd581093bcb\` (\`status\`), INDEX \`IDX_7a9faa7df80b1fc6401dbd5a54\` (\`scheduleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_fc99d6f814dd98b85e6d6d5451\` ON \`slots\` (\`gameId\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_acbc57d917e05609e3d222bcf0\` ON \`reservations\` (\`gameId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD CONSTRAINT \`FK_7a9faa7df80b1fc6401dbd5a544\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_fc99d6f814dd98b85e6d6d5451b\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_acbc57d917e05609e3d222bcf04\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reservations\` DROP FOREIGN KEY \`FK_acbc57d917e05609e3d222bcf04\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` DROP FOREIGN KEY \`FK_fc99d6f814dd98b85e6d6d5451b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` DROP FOREIGN KEY \`FK_7a9faa7df80b1fc6401dbd5a544\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_acbc57d917e05609e3d222bcf0\` ON \`reservations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fc99d6f814dd98b85e6d6d5451\` ON \`slots\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_7a9faa7df80b1fc6401dbd5a54\` ON \`games\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_05318b3cbff2443bd581093bcb\` ON \`games\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1ddf76422912e354a05479bcce\` ON \`games\``,
    );
    await queryRunner.query(`DROP TABLE \`games\``);
    await queryRunner.query(
      `ALTER TABLE \`reservations\` CHANGE \`gameId\` \`eventId\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` CHANGE \`gameId\` \`eventId\` int NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_c6fda79964e4d3a3e3f9843fbc\` ON \`reservations\` (\`eventId\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_665c6a54ef9c49866a7bfa21bc\` ON \`slots\` (\`eventId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_c6fda79964e4d3a3e3f9843fbc1\` FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_665c6a54ef9c49866a7bfa21bcd\` FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
