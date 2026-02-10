import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1765746870151 implements MigrationInterface {
  name = 'Init1765746870151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`slot_configs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduleId\` int NOT NULL, \`slotNumber\` int NOT NULL, \`team\` enum ('A', 'B') NOT NULL, \`isGoldOnly\` tinyint NOT NULL DEFAULT 0, \`coinsCost\` decimal(10,2) NULL, \`preAssignedUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_6f5dbb302e7ab92e2d41bcc06a\` (\`team\`), INDEX \`IDX_924cba4796804ec41a092c4bc7\` (\`slotNumber\`), INDEX \`IDX_8bc4703723bf551915bab41714\` (\`scheduleId\`), UNIQUE INDEX \`IDX_bcc91302d6b943e3522846788a\` (\`scheduleId\`, \`slotNumber\`, \`team\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`schedules\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`createdBy\` int NOT NULL, \`recurrenceType\` enum ('WEEKLY', 'MONTHLY', 'YEARLY', 'ONCE') NOT NULL, \`recurrenceDays\` json NULL, \`recurrencePattern\` json NULL, \`slotsPerEvent\` int NOT NULL, \`reservationCost\` decimal(10,2) NOT NULL, \`instantReservationCost\` decimal(10,2) NULL, \`confirmationWindowMinutes\` int NOT NULL, \`refundPolicy\` enum ('FULL', 'PARTIAL', 'NONE') NOT NULL DEFAULT 'NONE', \`refundPercentage\` int NULL, \`isExclusiveToGold\` tinyint NOT NULL DEFAULT 0, \`firstEventStartTime\` time NOT NULL, \`autoStartNextAfterMinutes\` int NULL, \`eventsPerDay\` int NOT NULL DEFAULT '1', \`spacingAfterFinishMinutes\` int NULL, \`teamAName\` varchar(255) NOT NULL, \`teamBName\` varchar(255) NOT NULL, \`preAssignedUsers\` json NULL, \`reminderMinutesBefore\` json NULL, \`url\` varchar(500) NULL DEFAULT 'https://youtube.com', \`isActive\` tinyint NOT NULL DEFAULT 1, \`deletedAt\` datetime NULL, \`deletedBy\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`createdByUserId\` int NULL, INDEX \`IDX_73a638854eafb90a9ec9d5d871\` (\`deletedAt\`), INDEX \`IDX_fc1e3baad88f7acd26b212377b\` (\`isActive\`), INDEX \`IDX_898b8e51fa21a1c38039bb054c\` (\`createdBy\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`games\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduleId\` int NOT NULL, \`status\` enum ('CREATED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'CREATED', \`scheduledStartTime\` datetime NOT NULL, \`actualStartTime\` datetime NULL, \`actualEndTime\` datetime NULL, \`durationMinutes\` int NULL, \`teamAName\` varchar(255) NOT NULL, \`teamBName\` varchar(255) NOT NULL, \`isExclusiveToGold\` tinyint NOT NULL DEFAULT 0, \`winningTeam\` enum ('A', 'B') NULL, \`mvpUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_1ddf76422912e354a05479bcce\` (\`scheduledStartTime\`), INDEX \`IDX_05318b3cbff2443bd581093bcb\` (\`status\`), INDEX \`IDX_7a9faa7df80b1fc6401dbd5a54\` (\`scheduleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`slots\` (\`id\` int NOT NULL AUTO_INCREMENT, \`gameId\` int NOT NULL, \`slotNumber\` int NOT NULL, \`team\` enum ('A', 'B') NOT NULL, \`isReserved\` tinyint NOT NULL DEFAULT 0, \`reservedByUserId\` int NULL, \`isPreAssigned\` tinyint NOT NULL DEFAULT 0, \`preAssignedUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_dda4708db37cb3e90144e539d7\` (\`team\`), INDEX \`IDX_fc99d6f814dd98b85e6d6d5451\` (\`gameId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`reservations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`slotId\` int NOT NULL, \`userId\` int NOT NULL, \`gameId\` int NOT NULL, \`status\` enum ('RESERVED', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'RESERVED', \`reservationCostPaid\` decimal(10,2) NOT NULL, \`confirmationCostPaid\` decimal(10,2) NOT NULL DEFAULT '0.00', \`totalCostPaid\` decimal(10,2) NOT NULL, \`discountApplied\` decimal(10,2) NULL, \`originalCost\` decimal(10,2) NULL, \`reservedAt\` datetime NOT NULL, \`confirmedAt\` datetime NULL, \`cancelledAt\` datetime NULL, \`expiredAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_c42f5dcdd13d6e63ee44b4cb23\` (\`status\`), INDEX \`IDX_acbc57d917e05609e3d222bcf0\` (\`gameId\`), INDEX \`IDX_aa0e1cc2c4f54da32bf8282154\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user_statistics\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`totalWins\` int NOT NULL DEFAULT '0', \`totalLosses\` int NOT NULL DEFAULT '0', \`totalEvents\` int NOT NULL DEFAULT '0', \`totalReservations\` int NOT NULL DEFAULT '0', \`totalCoinsSpent\` decimal(10,2) NOT NULL DEFAULT '0.00', \`totalCoinsEarned\` decimal(10,2) NOT NULL DEFAULT '0.00', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_163d3173e678c93fd100a33797\` (\`userId\`), UNIQUE INDEX \`REL_163d3173e678c93fd100a33797\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`refresh_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`token\` text NOT NULL, \`expiresAt\` datetime NOT NULL, \`isRevoked\` tinyint NOT NULL DEFAULT 0, \`revokedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_56b91d98f71e3d1b649ed6e9f3\` (\`expiresAt\`), INDEX \`IDX_610102b60fea1455310ccd299d\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`verification_codes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`code\` varchar(6) NOT NULL, \`expiresAt\` datetime NOT NULL, \`isUsed\` tinyint NOT NULL DEFAULT 0, \`usedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_fc6563f201dd4ee81361ffc038\` (\`expiresAt\`), INDEX \`IDX_9a854eeb4598a22d554ecfe6e8\` (\`userId\`), UNIQUE INDEX \`IDX_bb0f37096d5704cf8424fbd922\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stripe_products\` (\`id\` int NOT NULL AUTO_INCREMENT, \`stripeProductId\` varchar(255) NOT NULL, \`stripePriceId\` varchar(255) NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`type\` enum ('SUBSCRIPTION', 'COIN_PACK') NOT NULL, \`productData\` json NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`isArchived\` tinyint NOT NULL DEFAULT 0, \`displayOrder\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_62e2842bd4bd2774a639c62e5c\` (\`isActive\`), INDEX \`IDX_7d5a116dc6b8f9bbe7aab36f73\` (\`type\`), UNIQUE INDEX \`IDX_4e52fadf7392b1bd4baa4ddb7f\` (\`stripeProductId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stripe_payments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`stripeProductId\` int NOT NULL, \`stripePaymentIntentId\` varchar(255) NOT NULL, \`stripeCustomerId\` varchar(255) NOT NULL, \`type\` enum ('SUBSCRIPTION', 'COIN_PACK') NOT NULL, \`status\` enum ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING', \`amount\` decimal(10,2) NOT NULL, \`currency\` varchar(255) NOT NULL DEFAULT 'usd', \`coinsGranted\` int NULL, \`subscriptionId\` int NULL, \`metadata\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_a69ff5a562bf8ab61bf01cef6d\` (\`type\`), INDEX \`IDX_9a9395a354f7f3a2196501d22d\` (\`status\`), INDEX \`IDX_11633c4921cc2fb4d1349064ea\` (\`userId\`), UNIQUE INDEX \`IDX_17f1ea5064fb9f203ddbce158b\` (\`stripePaymentIntentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`subscriptions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`tier\` enum ('FREE', 'GOLD') NOT NULL, \`status\` enum ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING') NOT NULL DEFAULT 'PENDING', \`billingPeriod\` enum ('MONTHLY', 'SIX_MONTHS', 'YEARLY') NULL, \`stripeSubscriptionId\` varchar(255) NULL, \`stripeCustomerId\` varchar(255) NULL, \`currentPeriodStart\` datetime NULL, \`currentPeriodEnd\` datetime NULL, \`cancelAtPeriodEnd\` tinyint NOT NULL DEFAULT 0, \`canceledAt\` datetime NULL, \`expiresAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_6ccf973355b70645eff37774de\` (\`status\`), UNIQUE INDEX \`IDX_f2c80dc714001588227b512493\` (\`stripeSubscriptionId\`), UNIQUE INDEX \`IDX_fbdba4e2ac694cf8c9cecf4dc8\` (\`userId\`), UNIQUE INDEX \`REL_fbdba4e2ac694cf8c9cecf4dc8\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`device_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`token\` varchar(255) NOT NULL, \`platform\` enum ('IOS', 'ANDROID', 'WEB') NOT NULL, \`deviceId\` varchar(255) NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`lastUsedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_619d48b7cedf9a5e2397cbb13e\` (\`isActive\`), INDEX \`IDX_511957e3e8443429dc3fb00120\` (\`userId\`), UNIQUE INDEX \`IDX_977e24c520c49436d08e5eeea8\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notification_preferences\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`eventReminders\` tinyint NOT NULL DEFAULT 1, \`confirmationDeadlines\` tinyint NOT NULL DEFAULT 1, \`subscriptionUpdates\` tinyint NOT NULL DEFAULT 1, \`reservationUpdates\` tinyint NOT NULL DEFAULT 1, \`adminAlerts\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b70c44e8b00757584a39322559\` (\`userId\`), UNIQUE INDEX \`REL_b70c44e8b00757584a39322559\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`audit_logs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NULL, \`userEmail\` varchar(255) NULL, \`action\` varchar(255) NOT NULL, \`entityType\` varchar(255) NOT NULL, \`entityId\` varchar(255) NULL, \`details\` json NULL, \`ipAddress\` varchar(255) NULL, \`userAgent\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c69efb19bf127c97e6740ad530\` (\`createdAt\`), INDEX \`IDX_01993ae76b293d3b866cc3a125\` (\`entityType\`), INDEX \`IDX_cee5459245f652b75eb2759b4c\` (\`action\`), INDEX \`IDX_cfa83f61e4d27a87fcae1e025a\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`role\` enum ('admin', 'player') NOT NULL DEFAULT 'player', \`subscriptionTier\` enum ('FREE', 'GOLD') NOT NULL DEFAULT 'FREE', \`isVerified\` tinyint NOT NULL DEFAULT 0, \`isBanned\` tinyint NOT NULL DEFAULT 0, \`bannedUntil\` datetime NULL, \`isVoided\` tinyint NOT NULL DEFAULT 0, \`voidedBy\` int NULL, \`voidedAt\` datetime NULL, \`voidReason\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`transactions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`walletId\` int NOT NULL, \`type\` enum ('DEPOSIT', 'WITHDRAWAL', 'RESERVATION_COST', 'CONFIRMATION_COST', 'REFUND', 'REWARD', 'STRIPE_PURCHASE') NOT NULL, \`amount\` decimal(10,2) NOT NULL, \`description\` text NULL, \`reservationId\` int NULL, \`stripePaymentId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_a88f466d39796d3081cf96e1b6\` (\`walletId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`wallets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`balance\` decimal(10,2) NOT NULL DEFAULT '0.00', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2ecdb33f23e9a6fc392025c0b9\` (\`userId\`), UNIQUE INDEX \`REL_2ecdb33f23e9a6fc392025c0b9\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notification_history\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`deviceTokenId\` int NULL, \`type\` enum ('EVENT_REMINDER', 'CONFIRMATION_DEADLINE', 'SUBSCRIPTION_UPDATE', 'RESERVATION_UPDATE', 'ADMIN_ALERT', 'SCHEDULE_START', 'SCHEDULE_FINISHED') NOT NULL, \`title\` varchar(255) NOT NULL, \`body\` text NOT NULL, \`data\` json NULL, \`status\` enum ('SENT', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING', \`fcmMessageId\` varchar(255) NULL, \`error\` text NULL, \`sentAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_04b6ae61619ccf0ea20e0d67b5\` (\`createdAt\`), INDEX \`IDX_022b55751fd7c86ab78b9be257\` (\`status\`), INDEX \`IDX_e0f195a9b704ffc13d280f1e1b\` (\`type\`), INDEX \`IDX_0f4aa9bb533acbeda49fb4f7cd\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`app_config\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NOT NULL, \`value\` text NOT NULL, \`description\` text NULL, \`updatedBy\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e53f3c7882ebd6e79931e0fa95\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
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
      `DROP INDEX \`IDX_e53f3c7882ebd6e79931e0fa95\` ON \`app_config\``,
    );
    await queryRunner.query(`DROP TABLE \`app_config\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_0f4aa9bb533acbeda49fb4f7cd\` ON \`notification_history\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e0f195a9b704ffc13d280f1e1b\` ON \`notification_history\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_022b55751fd7c86ab78b9be257\` ON \`notification_history\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_04b6ae61619ccf0ea20e0d67b5\` ON \`notification_history\``,
    );
    await queryRunner.query(`DROP TABLE \`notification_history\``);
    await queryRunner.query(
      `DROP INDEX \`REL_2ecdb33f23e9a6fc392025c0b9\` ON \`wallets\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_2ecdb33f23e9a6fc392025c0b9\` ON \`wallets\``,
    );
    await queryRunner.query(`DROP TABLE \`wallets\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_a88f466d39796d3081cf96e1b6\` ON \`transactions\``,
    );
    await queryRunner.query(`DROP TABLE \`transactions\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_cfa83f61e4d27a87fcae1e025a\` ON \`audit_logs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cee5459245f652b75eb2759b4c\` ON \`audit_logs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_01993ae76b293d3b866cc3a125\` ON \`audit_logs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c69efb19bf127c97e6740ad530\` ON \`audit_logs\``,
    );
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
    await queryRunner.query(
      `DROP INDEX \`REL_b70c44e8b00757584a39322559\` ON \`notification_preferences\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b70c44e8b00757584a39322559\` ON \`notification_preferences\``,
    );
    await queryRunner.query(`DROP TABLE \`notification_preferences\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_977e24c520c49436d08e5eeea8\` ON \`device_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_511957e3e8443429dc3fb00120\` ON \`device_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_619d48b7cedf9a5e2397cbb13e\` ON \`device_tokens\``,
    );
    await queryRunner.query(`DROP TABLE \`device_tokens\``);
    await queryRunner.query(
      `DROP INDEX \`REL_fbdba4e2ac694cf8c9cecf4dc8\` ON \`subscriptions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fbdba4e2ac694cf8c9cecf4dc8\` ON \`subscriptions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f2c80dc714001588227b512493\` ON \`subscriptions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6ccf973355b70645eff37774de\` ON \`subscriptions\``,
    );
    await queryRunner.query(`DROP TABLE \`subscriptions\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_17f1ea5064fb9f203ddbce158b\` ON \`stripe_payments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_11633c4921cc2fb4d1349064ea\` ON \`stripe_payments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9a9395a354f7f3a2196501d22d\` ON \`stripe_payments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_a69ff5a562bf8ab61bf01cef6d\` ON \`stripe_payments\``,
    );
    await queryRunner.query(`DROP TABLE \`stripe_payments\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_4e52fadf7392b1bd4baa4ddb7f\` ON \`stripe_products\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_7d5a116dc6b8f9bbe7aab36f73\` ON \`stripe_products\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_62e2842bd4bd2774a639c62e5c\` ON \`stripe_products\``,
    );
    await queryRunner.query(`DROP TABLE \`stripe_products\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_bb0f37096d5704cf8424fbd922\` ON \`verification_codes\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9a854eeb4598a22d554ecfe6e8\` ON \`verification_codes\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fc6563f201dd4ee81361ffc038\` ON \`verification_codes\``,
    );
    await queryRunner.query(`DROP TABLE \`verification_codes\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_610102b60fea1455310ccd299d\` ON \`refresh_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_56b91d98f71e3d1b649ed6e9f3\` ON \`refresh_tokens\``,
    );
    await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
    await queryRunner.query(
      `DROP INDEX \`REL_163d3173e678c93fd100a33797\` ON \`user_statistics\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_163d3173e678c93fd100a33797\` ON \`user_statistics\``,
    );
    await queryRunner.query(`DROP TABLE \`user_statistics\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_aa0e1cc2c4f54da32bf8282154\` ON \`reservations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_acbc57d917e05609e3d222bcf0\` ON \`reservations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c42f5dcdd13d6e63ee44b4cb23\` ON \`reservations\``,
    );
    await queryRunner.query(`DROP TABLE \`reservations\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_fc99d6f814dd98b85e6d6d5451\` ON \`slots\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_dda4708db37cb3e90144e539d7\` ON \`slots\``,
    );
    await queryRunner.query(`DROP TABLE \`slots\``);
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
      `DROP INDEX \`IDX_898b8e51fa21a1c38039bb054c\` ON \`schedules\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fc1e3baad88f7acd26b212377b\` ON \`schedules\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_73a638854eafb90a9ec9d5d871\` ON \`schedules\``,
    );
    await queryRunner.query(`DROP TABLE \`schedules\``);
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
