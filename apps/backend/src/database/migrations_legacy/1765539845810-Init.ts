import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765539845810 implements MigrationInterface {
  name = 'Init1765539845810';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`slot_configs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduleId\` int NOT NULL, \`slotNumber\` int NOT NULL, \`team\` enum ('A', 'B') NOT NULL, \`isGoldOnly\` tinyint NOT NULL DEFAULT 0, \`coinsCost\` decimal(10,2) NULL, \`preAssignedUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_6f5dbb302e7ab92e2d41bcc06a\` (\`team\`), INDEX \`IDX_924cba4796804ec41a092c4bc7\` (\`slotNumber\`), INDEX \`IDX_8bc4703723bf551915bab41714\` (\`scheduleId\`), UNIQUE INDEX \`IDX_bcc91302d6b943e3522846788a\` (\`scheduleId\`, \`slotNumber\`, \`team\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` ADD CONSTRAINT \`FK_8bc4703723bf551915bab417147\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` ADD CONSTRAINT \`FK_0d0b9fd54b4734bd14a344f1ffc\` FOREIGN KEY (\`preAssignedUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` DROP FOREIGN KEY \`FK_0d0b9fd54b4734bd14a344f1ffc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` DROP FOREIGN KEY \`FK_8bc4703723bf551915bab417147\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bcc91302d6b943e3522846788a\` ON \`slot_configs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8bc4703723bf551915bab41714\` ON \`slot_configs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_924cba4796804ec41a092c4bc7\` ON \`slot_configs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6f5dbb302e7ab92e2d41bcc06a\` ON \`slot_configs\``,
    );
    await queryRunner.query(`DROP TABLE \`slot_configs\``);
  }
}
