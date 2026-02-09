import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1766000000000 implements MigrationInterface {
  name = 'InitialSchema1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`username\` varchar(255) NULL, \`password\` varchar(255) NOT NULL, \`role\` enum ('admin', 'player') NOT NULL DEFAULT 'player', \`subscriptionTier\` enum ('FREE', 'GOLD') NOT NULL DEFAULT 'FREE', \`isVerified\` tinyint NOT NULL DEFAULT 0, \`isBanned\` tinyint NOT NULL DEFAULT 0, \`bannedUntil\` datetime NULL, \`isVoided\` tinyint NOT NULL DEFAULT 0, \`voidedBy\` int NULL, \`voidedAt\` datetime NULL, \`voidReason\` text NULL, \`fullName\` varchar(255) NULL, \`addressLine1\` varchar(255) NULL, \`addressLine2\` varchar(255) NULL, \`city\` varchar(255) NULL, \`state\` varchar(255) NULL, \`country\` varchar(255) NULL, \`zipcode\` varchar(255) NULL, \`stripeCustomerId\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_users_email\` (\`email\`), UNIQUE INDEX \`UQ_users_username\` (\`username\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`wallets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`balance\` decimal(10,2) NOT NULL DEFAULT '0.00', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_wallets_userId\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user_statistics\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`totalWins\` int NOT NULL DEFAULT '0', \`totalLosses\` int NOT NULL DEFAULT '0', \`totalEvents\` int NOT NULL DEFAULT '0', \`totalReservations\` int NOT NULL DEFAULT '0', \`totalCoinsSpent\` decimal(10,2) NOT NULL DEFAULT '0.00', \`totalCoinsEarned\` decimal(10,2) NOT NULL DEFAULT '0.00', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_user_statistics_userId\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`refresh_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`token\` text NOT NULL, \`expiresAt\` datetime NOT NULL, \`isRevoked\` tinyint NOT NULL DEFAULT 0, \`revokedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_refresh_tokens_userId\` (\`userId\`), INDEX \`IDX_refresh_tokens_expiresAt\` (\`expiresAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`verification_codes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`code\` varchar(6) NOT NULL, \`expiresAt\` datetime NOT NULL, \`isUsed\` tinyint NOT NULL DEFAULT 0, \`usedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_verification_codes_code\` (\`code\`), INDEX \`IDX_verification_codes_userId\` (\`userId\`), INDEX \`IDX_verification_codes_expiresAt\` (\`expiresAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`password_reset_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`token\` varchar(255) NOT NULL, \`expiresAt\` datetime NOT NULL, \`isUsed\` tinyint NOT NULL DEFAULT 0, \`usedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_password_reset_tokens_token\` (\`token\`), INDEX \`IDX_password_reset_tokens_userId\` (\`userId\`), INDEX \`IDX_password_reset_tokens_expiresAt\` (\`expiresAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`subscriptions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`tier\` enum ('FREE', 'GOLD') NOT NULL, \`status\` enum ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING') NOT NULL DEFAULT 'PENDING', \`billingPeriod\` enum ('MONTHLY', 'SIX_MONTHS', 'YEARLY') NULL, \`stripeSubscriptionId\` varchar(255) NULL, \`stripeCustomerId\` varchar(255) NULL, \`currentPeriodStart\` datetime NULL, \`currentPeriodEnd\` datetime NULL, \`cancelAtPeriodEnd\` tinyint NOT NULL DEFAULT 0, \`canceledAt\` datetime NULL, \`expiresAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_subscriptions_userId\` (\`userId\`), UNIQUE INDEX \`UQ_subscriptions_stripeSubscriptionId\` (\`stripeSubscriptionId\`), INDEX \`IDX_subscriptions_status\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stripe_products\` (\`id\` int NOT NULL AUTO_INCREMENT, \`stripeProductId\` varchar(255) NOT NULL, \`stripePriceId\` varchar(255) NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`type\` enum ('SUBSCRIPTION', 'COIN_PACK') NOT NULL, \`productData\` json NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`isArchived\` tinyint NOT NULL DEFAULT 0, \`displayOrder\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_stripe_products_stripeProductId\` (\`stripeProductId\`), INDEX \`IDX_stripe_products_type\` (\`type\`), INDEX \`IDX_stripe_products_isActive\` (\`isActive\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stripe_payments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`stripeProductId\` int NOT NULL, \`stripePaymentIntentId\` varchar(255) NOT NULL, \`stripeCustomerId\` varchar(255) NOT NULL, \`type\` enum ('SUBSCRIPTION', 'COIN_PACK') NOT NULL, \`status\` enum ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING', \`amount\` decimal(10,2) NOT NULL, \`currency\` varchar(255) NOT NULL DEFAULT 'usd', \`coinsGranted\` int NULL, \`subscriptionId\` int NULL, \`metadata\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_stripe_payments_paymentIntentId\` (\`stripePaymentIntentId\`), INDEX \`IDX_stripe_payments_userId\` (\`userId\`), INDEX \`IDX_stripe_payments_status\` (\`status\`), INDEX \`IDX_stripe_payments_type\` (\`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stripe_payment_methods\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`stripePaymentMethodId\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`last4\` varchar(255) NULL, \`brand\` varchar(255) NULL, \`expMonth\` int NULL, \`expYear\` int NULL, \`isDefault\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_stripe_payment_methods_paymentMethodId\` (\`stripePaymentMethodId\`), INDEX \`IDX_stripe_payment_methods_userId\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`schedules\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`createdBy\` int NOT NULL, \`recurrenceType\` enum ('WEEKLY', 'MONTHLY', 'YEARLY', 'ONCE') NOT NULL, \`recurrenceDays\` json NULL, \`recurrencePattern\` json NULL, \`slotsPerGame\` int NOT NULL, \`reservationCost\` decimal(10,2) NOT NULL, \`instantReservationCost\` decimal(10,2) NULL, \`confirmationWindowMinutes\` int NOT NULL, \`refundPolicy\` enum ('FULL', 'PARTIAL', 'NONE') NOT NULL DEFAULT 'NONE', \`refundPercentage\` int NULL, \`isExclusiveToGold\` tinyint NOT NULL DEFAULT 0, \`firstGameStartTime\` time NOT NULL, \`autoStartNextAfterMinutes\` int NULL, \`gamesPerDay\` int NOT NULL DEFAULT '1', \`spacingAfterFinishMinutes\` int NULL, \`teamAName\` varchar(255) NOT NULL, \`teamBName\` varchar(255) NOT NULL, \`preAssignedUsers\` json NULL, \`reminderMinutesBefore\` json NULL, \`url\` varchar(500) NULL DEFAULT 'https://youtube.com', \`isActive\` tinyint NOT NULL DEFAULT 1, \`deletedAt\` datetime NULL, \`deletedBy\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`createdByUserId\` int NULL, INDEX \`IDX_schedules_createdBy\` (\`createdBy\`), INDEX \`IDX_schedules_isActive\` (\`isActive\`), INDEX \`IDX_schedules_deletedAt\` (\`deletedAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`games\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduleId\` int NOT NULL, \`status\` enum ('CREATED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'CREATED', \`scheduledStartTime\` datetime NOT NULL, \`actualStartTime\` datetime NULL, \`actualEndTime\` datetime NULL, \`durationMinutes\` int NULL, \`teamAName\` varchar(255) NOT NULL, \`teamBName\` varchar(255) NOT NULL, \`isExclusiveToGold\` tinyint NOT NULL DEFAULT 0, \`winningTeam\` enum ('A', 'B') NULL, \`mvpUserId\` int NULL, \`url\` varchar(500) NULL, \`generationBatchId\` varchar(36) NULL, \`gameIndex\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_games_scheduleId\` (\`scheduleId\`), INDEX \`IDX_games_status\` (\`status\`), INDEX \`IDX_games_scheduledStartTime\` (\`scheduledStartTime\`), INDEX \`IDX_games_generationBatchId\` (\`generationBatchId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`slots\` (\`id\` int NOT NULL AUTO_INCREMENT, \`gameId\` int NOT NULL, \`slotNumber\` int NOT NULL, \`team\` enum ('A', 'B') NOT NULL, \`isReserved\` tinyint NOT NULL DEFAULT 0, \`reservedByUserId\` int NULL, \`isPreAssigned\` tinyint NOT NULL DEFAULT 0, \`preAssignedUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_slots_gameId\` (\`gameId\`), INDEX \`IDX_slots_team\` (\`team\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`reservations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`slotId\` int NOT NULL, \`userId\` int NOT NULL, \`gameId\` int NOT NULL, \`status\` enum ('RESERVED', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'RESERVED', \`reservationCostPaid\` decimal(10,2) NOT NULL, \`confirmationCostPaid\` decimal(10,2) NOT NULL DEFAULT '0.00', \`totalCostPaid\` decimal(10,2) NOT NULL, \`discountApplied\` decimal(10,2) NULL, \`originalCost\` decimal(10,2) NULL, \`reservedAt\` datetime NOT NULL, \`confirmedAt\` datetime NULL, \`cancelledAt\` datetime NULL, \`expiredAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_reservations_userId\` (\`userId\`), INDEX \`IDX_reservations_gameId\` (\`gameId\`), INDEX \`IDX_reservations_status\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`slot_configs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduleId\` int NOT NULL, \`slotNumber\` int NOT NULL, \`team\` enum ('A', 'B') NOT NULL, \`isGoldOnly\` tinyint NOT NULL DEFAULT 0, \`coinsCost\` decimal(10,2) NULL, \`preAssignedUserId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_slot_configs_scheduleId\` (\`scheduleId\`), INDEX \`IDX_slot_configs_slotNumber\` (\`slotNumber\`), INDEX \`IDX_slot_configs_team\` (\`team\`), UNIQUE INDEX \`UQ_slot_configs_schedule_slot_team\` (\`scheduleId\`, \`slotNumber\`, \`team\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`transactions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`walletId\` int NOT NULL, \`type\` enum ('DEPOSIT', 'WITHDRAWAL', 'RESERVATION_COST', 'CONFIRMATION_COST', 'REFUND', 'REWARD', 'STRIPE_PURCHASE') NOT NULL, \`amount\` decimal(10,2) NOT NULL, \`description\` text NULL, \`reservationId\` int NULL, \`stripePaymentId\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_transactions_walletId\` (\`walletId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`device_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`token\` varchar(255) NOT NULL, \`platform\` enum ('IOS', 'ANDROID', 'WEB') NOT NULL, \`deviceId\` varchar(255) NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`lastUsedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_device_tokens_token\` (\`token\`), INDEX \`IDX_device_tokens_userId\` (\`userId\`), INDEX \`IDX_device_tokens_isActive\` (\`isActive\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notification_preferences\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`eventReminders\` tinyint NOT NULL DEFAULT 1, \`confirmationDeadlines\` tinyint NOT NULL DEFAULT 1, \`subscriptionUpdates\` tinyint NOT NULL DEFAULT 1, \`reservationUpdates\` tinyint NOT NULL DEFAULT 1, \`adminAlerts\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_notification_preferences_userId\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notification_history\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`deviceTokenId\` int NULL, \`type\` enum ('EVENT_REMINDER', 'CONFIRMATION_DEADLINE', 'SUBSCRIPTION_UPDATE', 'RESERVATION_UPDATE', 'ADMIN_ALERT', 'SCHEDULE_START', 'SCHEDULE_FINISHED', 'FIRST_GAME_START', 'GAME_START', 'LAST_GAME_START', 'FIRST_GAME_FINISH', 'GAME_FINISH', 'LAST_GAME_FINISH') NOT NULL, \`title\` varchar(255) NOT NULL, \`body\` text NOT NULL, \`data\` json NULL, \`status\` enum ('SENT', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING', \`fcmMessageId\` varchar(255) NULL, \`error\` text NULL, \`sentAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_notification_history_userId\` (\`userId\`), INDEX \`IDX_notification_history_type\` (\`type\`), INDEX \`IDX_notification_history_status\` (\`status\`), INDEX \`IDX_notification_history_createdAt\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`audit_logs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NULL, \`userEmail\` varchar(255) NULL, \`action\` varchar(255) NOT NULL, \`entityType\` varchar(255) NOT NULL, \`entityId\` varchar(255) NULL, \`details\` json NULL, \`ipAddress\` varchar(255) NULL, \`userAgent\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_audit_logs_userId\` (\`userId\`), INDEX \`IDX_audit_logs_action\` (\`action\`), INDEX \`IDX_audit_logs_entityType\` (\`entityType\`), INDEX \`IDX_audit_logs_createdAt\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`app_config\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NOT NULL, \`value\` text NOT NULL, \`description\` text NULL, \`updatedBy\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_app_config_key\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`conversations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('DIRECT', 'GROUP') NOT NULL DEFAULT 'DIRECT', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`lastMessageAt\` datetime NULL, INDEX \`IDX_conversations_lastMessageAt\` (\`lastMessageAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`messages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`conversationId\` int NOT NULL, \`senderId\` int NOT NULL, \`content\` text NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_messages_conversationId\` (\`conversationId\`), INDEX \`IDX_messages_createdAt\` (\`createdAt\`), INDEX \`IDX_messages_senderId\` (\`senderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`conversation_participants\` (\`id\` int NOT NULL AUTO_INCREMENT, \`conversationId\` int NOT NULL, \`userId\` int NOT NULL, \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`lastReadAt\` datetime NULL, UNIQUE INDEX \`UQ_conversation_participants_conversation_user\` (\`conversationId\`, \`userId\`), INDEX \`IDX_conversation_participants_conversationId\` (\`conversationId\`), INDEX \`IDX_conversation_participants_userId\` (\`userId\`), INDEX \`IDX_conversation_participants_lastReadAt\` (\`lastReadAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tags\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_tags_name\` (\`name\`), UNIQUE INDEX \`UQ_tags_slug\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`description\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_categories_name\` (\`name\`), UNIQUE INDEX \`UQ_categories_slug\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorials\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`body\` text NOT NULL, \`excerpt\` text NULL, \`status\` enum ('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT', \`featured\` tinyint NOT NULL DEFAULT 0, \`viewCount\` int NOT NULL DEFAULT '0', \`authorId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_tutorials_slug\` (\`slug\`), INDEX \`IDX_tutorials_status\` (\`status\`), INDEX \`IDX_tutorials_featured\` (\`featured\`), INDEX \`IDX_tutorials_authorId\` (\`authorId\`), INDEX \`IDX_tutorials_createdAt\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorial_tags\` (\`tutorialId\` int NOT NULL, \`tagId\` int NOT NULL, INDEX \`IDX_tutorial_tags_tutorialId\` (\`tutorialId\`), INDEX \`IDX_tutorial_tags_tagId\` (\`tagId\`), PRIMARY KEY (\`tutorialId\`, \`tagId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorial_categories\` (\`tutorialId\` int NOT NULL, \`categoryId\` int NOT NULL, INDEX \`IDX_tutorial_categories_tutorialId\` (\`tutorialId\`), INDEX \`IDX_tutorial_categories_categoryId\` (\`categoryId\`), PRIMARY KEY (\`tutorialId\`, \`categoryId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`wallets\` ADD CONSTRAINT \`FK_wallets_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_statistics\` ADD CONSTRAINT \`FK_user_statistics_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_refresh_tokens_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`verification_codes\` ADD CONSTRAINT \`FK_verification_codes_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` ADD CONSTRAINT \`FK_password_reset_tokens_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`subscriptions\` ADD CONSTRAINT \`FK_subscriptions_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` ADD CONSTRAINT \`FK_stripe_payments_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` ADD CONSTRAINT \`FK_stripe_payments_stripeProductId\` FOREIGN KEY (\`stripeProductId\`) REFERENCES \`stripe_products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payments\` ADD CONSTRAINT \`FK_stripe_payments_subscriptionId\` FOREIGN KEY (\`subscriptionId\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payment_methods\` ADD CONSTRAINT \`FK_stripe_payment_methods_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`schedules\` ADD CONSTRAINT \`FK_schedules_createdByUserId\` FOREIGN KEY (\`createdByUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`games\` ADD CONSTRAINT \`FK_games_scheduleId\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_slots_gameId\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_reservations_slotId\` FOREIGN KEY (\`slotId\`) REFERENCES \`slots\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_reservations_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_reservations_gameId\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` ADD CONSTRAINT \`FK_slot_configs_scheduleId\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`slot_configs\` ADD CONSTRAINT \`FK_slot_configs_preAssignedUserId\` FOREIGN KEY (\`preAssignedUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_transactions_walletId\` FOREIGN KEY (\`walletId\`) REFERENCES \`wallets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_transactions_reservationId\` FOREIGN KEY (\`reservationId\`) REFERENCES \`reservations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_transactions_stripePaymentId\` FOREIGN KEY (\`stripePaymentId\`) REFERENCES \`stripe_payments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`device_tokens\` ADD CONSTRAINT \`FK_device_tokens_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_preferences\` ADD CONSTRAINT \`FK_notification_preferences_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` ADD CONSTRAINT \`FK_notification_history_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notification_history\` ADD CONSTRAINT \`FK_notification_history_deviceTokenId\` FOREIGN KEY (\`deviceTokenId\`) REFERENCES \`device_tokens\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_audit_logs_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_messages_conversationId\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_messages_senderId\` FOREIGN KEY (\`senderId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD CONSTRAINT \`FK_conversation_participants_conversationId\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_participants\` ADD CONSTRAINT \`FK_conversation_participants_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` ADD CONSTRAINT \`FK_tutorials_authorId\` FOREIGN KEY (\`authorId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_tags\` ADD CONSTRAINT \`FK_tutorial_tags_tutorialId\` FOREIGN KEY (\`tutorialId\`) REFERENCES \`tutorials\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_tags\` ADD CONSTRAINT \`FK_tutorial_tags_tagId\` FOREIGN KEY (\`tagId\`) REFERENCES \`tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_categories\` ADD CONSTRAINT \`FK_tutorial_categories_tutorialId\` FOREIGN KEY (\`tutorialId\`) REFERENCES \`tutorials\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_categories\` ADD CONSTRAINT \`FK_tutorial_categories_categoryId\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query(`DROP TABLE IF EXISTS \`tutorial_categories\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tutorial_tags\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tutorials\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`categories\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tags\``);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`conversation_participants\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`messages\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`conversations\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`app_config\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`notification_history\``);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`notification_preferences\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`device_tokens\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transactions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`slot_configs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`reservations\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`slots\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`games\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`schedules\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`stripe_payment_methods\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`stripe_payments\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`stripe_products\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`subscriptions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`password_reset_tokens\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`verification_codes\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`refresh_tokens\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_statistics\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`wallets\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
