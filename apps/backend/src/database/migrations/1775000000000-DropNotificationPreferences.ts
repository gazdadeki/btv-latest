import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropNotificationPreferences1775000000000 implements MigrationInterface {
  name = 'DropNotificationPreferences1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notification_preferences\` DROP FOREIGN KEY \`FK_notification_preferences_userId\``,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`notification_preferences\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`notification_preferences\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`eventReminders\` tinyint NOT NULL DEFAULT 1, \`confirmationDeadlines\` tinyint NOT NULL DEFAULT 1, \`subscriptionUpdates\` tinyint NOT NULL DEFAULT 1, \`reservationUpdates\` tinyint NOT NULL DEFAULT 1, \`adminAlerts\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_notification_preferences_userId\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_preferences\` ADD CONSTRAINT \`FK_notification_preferences_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
