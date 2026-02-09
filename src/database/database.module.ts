import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { LogLevel } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { VerificationCode } from '../verification/entities/verification-code.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { AppConfig } from '../config/entities/app-config.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { StripeProduct } from '../stripe/entities/stripe-product.entity';
import { StripePayment } from '../stripe/entities/stripe-payment.entity';
import { StripePaymentMethod } from '../stripe/entities/stripe-payment-method.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SlotConfig } from '../schedules/entities/slot-config.entity';
import { Game } from '../games/entities/game.entity';
import { Slot } from '../games/entities/slot.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { UserStatistics } from '../statistics/entities/user-statistics.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { DeviceToken } from '../firebase/entities/device-token.entity';
import { NotificationPreference } from '../firebase/entities/notification-preference.entity';
import { NotificationHistory } from '../firebase/entities/notification-history.entity';
import { Conversation } from '../messages/entities/conversation.entity';
import { ConversationParticipant } from '../messages/entities/conversation-participant.entity';
import { Message } from '../messages/entities/message.entity';
import { Tutorial } from '../tutorials/entities/tutorial.entity';
import { Tag } from '../tutorials/entities/tag.entity';
import { Category } from '../tutorials/entities/category.entity';

/**
 * Database module configuration for TypeORM.
 *
 * Configures MySQL/Percona XtraDB Cluster connection with all application entities.
 *
 * Connection settings are read from environment variables (required):
 * - DB_HOST: Database host
 * - DB_PORT: Database port
 * - DB_USERNAME: Database username
 * - DB_PASSWORD: Database password
 * - DB_DATABASE: Database name
 *
 * Synchronization:
 * - Controlled by TYPEORM_SYNCHRONIZE (default false)
 * - Use migrations for schema changes in shared/prod environments
 * - WARNING: Never use synchronize:true in production as it can cause data loss
 *
 * Logging is enabled in development mode only.
 */
/**
 * Get database configuration with validation.
 * Throws descriptive errors if required environment variables are missing.
 */
function getDatabaseConfig() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_DATABASE;
  const shouldSynchronize = process.env.TYPEORM_SYNCHRONIZE === 'true';
  const retryAttemptsRaw = Number.parseInt(
    process.env.TYPEORM_RETRY_ATTEMPTS || '30',
    10,
  );
  const retryDelayRaw = Number.parseInt(
    process.env.TYPEORM_RETRY_DELAY_MS || '2000',
    10,
  );
  const retryAttempts =
    Number.isFinite(retryAttemptsRaw) && retryAttemptsRaw >= 0
      ? retryAttemptsRaw
      : 30;
  const retryDelay =
    Number.isFinite(retryDelayRaw) && retryDelayRaw >= 0 ? retryDelayRaw : 2000;
  const maxQueryExecutionTime = Number.parseInt(
    process.env.TYPEORM_MAX_QUERY_MS || '0',
    10,
  );
  const enableSlowQueryLogging =
    Number.isFinite(maxQueryExecutionTime) && maxQueryExecutionTime > 0;
  const isDev = process.env.NODE_ENV === 'development';
  const logLevels: LogLevel[] = isDev
    ? ['query', 'error', 'warn']
    : enableSlowQueryLogging
      ? ['error', 'warn']
      : ['error'];

  // Log for debugging
  console.log('[DatabaseModule] Loading database config...');
  console.log(`[DatabaseModule] DB_HOST: ${host || 'MISSING'}`);
  console.log(`[DatabaseModule] DB_PORT: ${port || 'MISSING'}`);
  console.log(`[DatabaseModule] DB_USERNAME: ${username ? 'SET' : 'MISSING'}`);
  console.log(`[DatabaseModule] DB_DATABASE: ${database || 'MISSING'}`);

  if (!host) {
    console.error('[DatabaseModule] DB_HOST is missing!');
    throw new Error('DB_HOST environment variable is required');
  }
  if (!port) {
    console.error('[DatabaseModule] DB_PORT is missing!');
    throw new Error('DB_PORT environment variable is required');
  }
  if (!username) {
    console.error('[DatabaseModule] DB_USERNAME is missing!');
    throw new Error('DB_USERNAME environment variable is required');
  }
  if (!password) {
    console.error('[DatabaseModule] DB_PASSWORD is missing!');
    throw new Error('DB_PASSWORD environment variable is required');
  }
  if (!database) {
    console.error('[DatabaseModule] DB_DATABASE is missing!');
    throw new Error('DB_DATABASE environment variable is required');
  }

  return {
    type: 'mysql' as const,
    host,
    port: parseInt(port, 10),
    username,
    password,
    database,
    synchronize: shouldSynchronize,
    retryAttempts,
    retryDelay,
    maxQueryExecutionTime: enableSlowQueryLogging
      ? maxQueryExecutionTime
      : undefined,
    logging: logLevels,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...getDatabaseConfig(),
      entities: [
        User,
        VerificationCode,
        RefreshToken,
        PasswordResetToken,
        AppConfig,
        Wallet,
        Transaction,
        Subscription,
        StripeProduct,
        StripePayment,
        StripePaymentMethod,
        Schedule,
        SlotConfig,
        Game,
        Slot,
        Reservation,
        UserStatistics,
        AuditLog,
        DeviceToken,
        NotificationPreference,
        NotificationHistory,
        Conversation,
        ConversationParticipant,
        Message,
        Tutorial,
        Tag,
        Category,
      ],
      // Synchronization: controlled by TYPEORM_SYNCHRONIZE (default false)
      // Use migrations for schema changes in shared/prod environments.
      // Enable full query logging in development, slow-query logging elsewhere
    }),
  ],
})
export class DatabaseModule {}
