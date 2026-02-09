import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765769383791 implements MigrationInterface {
  name = 'Init1765769383791';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `ALTER TABLE \`slot_configs\` ADD CONSTRAINT \`FK_8bc4703723bf551915bab417147\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` ADD CONSTRAINT \`FK_0d0b9fd54b4734bd14a344f1ffc\` FOREIGN KEY (\`preAssignedUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD CONSTRAINT \`FK_269e34265a1c1c9b2c618c8b70f\` FOREIGN KEY (\`createdByUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD CONSTRAINT \`FK_7a9faa7df80b1fc6401dbd5a544\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_fc99d6f814dd98b85e6d6d5451b\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_dc51c9eaf78b301960bfc65dbe2\` FOREIGN KEY (\`slotId\`) REFERENCES \`slots\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_aa0e1cc2c4f54da32bf8282154c\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_acbc57d917e05609e3d222bcf04\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_statistics\` ADD CONSTRAINT \`FK_163d3173e678c93fd100a337976\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_610102b60fea1455310ccd299de\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`verification_codes\` ADD CONSTRAINT \`FK_9a854eeb4598a22d554ecfe6e81\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` ADD CONSTRAINT \`FK_11633c4921cc2fb4d1349064ea8\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` ADD CONSTRAINT \`FK_390f2005ea0ed45e1f94d848f1d\` FOREIGN KEY (\`stripeProductId\`) REFERENCES \`stripe_products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` ADD CONSTRAINT \`FK_c066e16dc2fb195f19429b26dad\` FOREIGN KEY (\`subscriptionId\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`subscriptions\` ADD CONSTRAINT \`FK_fbdba4e2ac694cf8c9cecf4dc84\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`device_tokens\` ADD CONSTRAINT \`FK_511957e3e8443429dc3fb00120c\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_preferences\` ADD CONSTRAINT \`FK_b70c44e8b00757584a393225593\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_cfa83f61e4d27a87fcae1e025ab\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
    await queryRunner.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_a88f466d39796d3081cf96e1b66\` FOREIGN KEY (\`walletId\`) REFERENCES \`wallets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_15381d776dd4d73691b6b03400d\` FOREIGN KEY (\`reservationId\`) REFERENCES \`reservations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_b5b3d8856f44d91b89a7ca90d5a\` FOREIGN KEY (\`stripePaymentId\`) REFERENCES \`stripe_payments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`wallets\` ADD CONSTRAINT \`FK_2ecdb33f23e9a6fc392025c0b97\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` ADD CONSTRAINT \`FK_0f4aa9bb533acbeda49fb4f7cd0\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` ADD CONSTRAINT \`FK_225aef07950ec5861eae912f62d\` FOREIGN KEY (\`deviceTokenId\`) REFERENCES \`device_tokens\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` DROP FOREIGN KEY \`FK_225aef07950ec5861eae912f62d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` DROP FOREIGN KEY \`FK_0f4aa9bb533acbeda49fb4f7cd0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`wallets\` DROP FOREIGN KEY \`FK_2ecdb33f23e9a6fc392025c0b97\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_b5b3d8856f44d91b89a7ca90d5a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_15381d776dd4d73691b6b03400d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_a88f466d39796d3081cf96e1b66\``,
    );
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
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_cfa83f61e4d27a87fcae1e025ab\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_preferences\` DROP FOREIGN KEY \`FK_b70c44e8b00757584a393225593\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`device_tokens\` DROP FOREIGN KEY \`FK_511957e3e8443429dc3fb00120c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`subscriptions\` DROP FOREIGN KEY \`FK_fbdba4e2ac694cf8c9cecf4dc84\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` DROP FOREIGN KEY \`FK_c066e16dc2fb195f19429b26dad\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` DROP FOREIGN KEY \`FK_390f2005ea0ed45e1f94d848f1d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` DROP FOREIGN KEY \`FK_11633c4921cc2fb4d1349064ea8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`verification_codes\` DROP FOREIGN KEY \`FK_9a854eeb4598a22d554ecfe6e81\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_610102b60fea1455310ccd299de\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_statistics\` DROP FOREIGN KEY \`FK_163d3173e678c93fd100a337976\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` DROP FOREIGN KEY \`FK_acbc57d917e05609e3d222bcf04\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` DROP FOREIGN KEY \`FK_aa0e1cc2c4f54da32bf8282154c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` DROP FOREIGN KEY \`FK_dc51c9eaf78b301960bfc65dbe2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` DROP FOREIGN KEY \`FK_fc99d6f814dd98b85e6d6d5451b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` DROP FOREIGN KEY \`FK_7a9faa7df80b1fc6401dbd5a544\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` DROP FOREIGN KEY \`FK_269e34265a1c1c9b2c618c8b70f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` DROP FOREIGN KEY \`FK_0d0b9fd54b4734bd14a344f1ffc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` DROP FOREIGN KEY \`FK_8bc4703723bf551915bab417147\``,
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
  }
}
