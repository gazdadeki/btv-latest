import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixConversationParticipants1765769696081 implements MigrationInterface {
  name = 'FixConversationParticipants1765769696081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the table if it exists (it was created with wrong structure by ManyToMany)
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`conversation_participants\``,
    );

    // Create the table with correct structure
    await queryRunner.query(`
            CREATE TABLE \`conversation_participants\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`conversationId\` int NOT NULL,
                \`userId\` int NOT NULL,
                \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`lastReadAt\` datetime NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_e43efbfa3b850160b5b2c50e3e\` (\`conversationId\`, \`userId\`),
                KEY \`IDX_conversationId\` (\`conversationId\`),
                KEY \`IDX_userId\` (\`userId\`),
                KEY \`IDX_lastReadAt\` (\`lastReadAt\`),
                CONSTRAINT \`FK_4453e20858b14ab765a09ad728c\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_18c4ba3b127461649e5f5039dbf\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`conversation_participants\``,
    );
  }
}
