import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765768174156 implements MigrationInterface {
  name = 'Init1765768174156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_e43efbfa3b850160b5b2c50e3e\` ON \`conversation_participants\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP COLUMN \`id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP COLUMN \`joinedAt\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP COLUMN \`lastReadAt\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`userId\`, \`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD \`lastReadAt\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`userId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`userId\`, \`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`id\`, \`conversationId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`id\`, \`userId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_535b887b4fc510959d0a51ffd0\` ON \`conversation_participants\` (\`lastReadAt\`)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_e43efbfa3b850160b5b2c50e3e\` ON \`conversation_participants\` (\`conversationId\`, \`userId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_e5663ce0c730b2de83445e2fd19\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_2db9cf2b3ca111742793f6c37ce\` FOREIGN KEY (\`senderId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD CONSTRAINT \`FK_4453e20858b14ab765a09ad728c\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD CONSTRAINT \`FK_18c4ba3b127461649e5f5039dbf\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP FOREIGN KEY \`FK_18c4ba3b127461649e5f5039dbf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP FOREIGN KEY \`FK_4453e20858b14ab765a09ad728c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_2db9cf2b3ca111742793f6c37ce\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_e5663ce0c730b2de83445e2fd19\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e43efbfa3b850160b5b2c50e3e\` ON \`conversation_participants\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_535b887b4fc510959d0a51ffd0\` ON \`conversation_participants\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`userId\`, \`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`userId\`, \`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`userId\`, \`id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP COLUMN \`lastReadAt\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP COLUMN \`joinedAt\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD PRIMARY KEY (\`conversationId\`, \`userId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` DROP COLUMN \`id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD \`lastReadAt\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_e43efbfa3b850160b5b2c50e3e\` ON \`conversation_participants\` (\`conversationId\`, \`userId\`)`,
    );
  }
}
