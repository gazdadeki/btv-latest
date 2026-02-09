import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { DeviceToken, Platform } from './entities/device-token.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import {
  NotificationHistory,
  NotificationType,
  NotificationStatus,
} from './entities/notification-history.entity';

/**
 * Data structure for sending notifications.
 */
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Service for managing Firebase Cloud Messaging and push notifications.
 * Handles device token registration, notification preferences, and sending notifications.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationHistory)
    private notificationHistoryRepository: Repository<NotificationHistory>,
  ) {}

  onModuleInit() {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    // Firebase is optional - if env var is not set, skip initialization
    if (!serviceAccountPath) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_PATH not set. Firebase notifications will be disabled.',
      );
      return;
    }

    // Try to resolve the path (relative to project root or absolute)
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
      try {
        const serviceAccount = JSON.parse(
          fs.readFileSync(resolvedPath, 'utf8'),
        );

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.logger.log('Firebase Admin SDK initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK:', error);
        this.logger.warn('Firebase notifications will be disabled');
      }
    } else {
      this.logger.warn(
        `Firebase service account file not found at: ${resolvedPath}`,
      );
      this.logger.warn(
        'Firebase notifications will be disabled. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to enable.',
      );
    }
  }

  /**
   * Register a device token for push notifications.
   * @param userId - User ID to associate with the token
   * @param token - FCM device token
   * @param platform - Device platform (iOS, Android, Web)
   * @param deviceId - Optional device identifier
   * @returns Saved device token entity
   */
  async registerDeviceToken(
    userId: number,
    token: string,
    platform: Platform,
    deviceId?: string,
  ): Promise<DeviceToken> {
    const existing = await this.deviceTokenRepository.findOne({
      where: { token },
    });

    if (existing) {
      existing.userId = userId;
      existing.lastUsedAt = new Date();
      existing.isActive = true;
      return this.deviceTokenRepository.save(existing);
    }

    const deviceToken = this.deviceTokenRepository.create({
      userId,
      token,
      platform,
      deviceId,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Unregister a device token (mark as inactive).
   * @param tokenId - Device token ID
   * @param userId - User ID (for verification)
   */
  async unregisterDeviceToken(tokenId: number, userId: number): Promise<void> {
    const token = await this.deviceTokenRepository.findOne({
      where: { id: tokenId, userId },
    });
    if (token) {
      token.isActive = false;
      await this.deviceTokenRepository.save(token);
    }
  }

  /**
   * Get notification preferences for a user.
   * Creates default preferences if they don't exist.
   * @param userId - User ID
   * @returns Notification preferences
   */
  async getNotificationPreferences(
    userId: number,
  ): Promise<NotificationPreference> {
    let preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.notificationPreferenceRepository.create({
        userId,
        eventReminders: true,
        confirmationDeadlines: true,
        subscriptionUpdates: true,
        reservationUpdates: true,
        adminAlerts: false,
      });
      preferences =
        await this.notificationPreferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Update notification preferences for a user.
   * @param userId - User ID
   * @param data - Partial preference updates
   * @returns Updated preferences
   */
  async updateNotificationPreferences(
    userId: number,
    data: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    const preferences = await this.getNotificationPreferences(userId);
    Object.assign(preferences, data);
    return this.notificationPreferenceRepository.save(preferences);
  }

  /**
   * Send a notification to a specific user.
   * Respects user notification preferences.
   * @param userId - User ID to send notification to
   * @param notification - Notification data
   */
  async sendNotification(
    userId: number,
    notification: NotificationData,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.debug('Firebase not initialized, skipping notification');
      return;
    }

    const preferences = await this.getNotificationPreferences(userId);
    if (!this.shouldSendNotification(preferences, notification.type)) {
      return;
    }

    const tokens = await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      return;
    }

    const deviceTokens = tokens.map((t) => t.token);

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data ? this.stringifyData(notification.data) : {},
        tokens: deviceTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Save notification history
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const result = response.responses[i];
        const history = this.notificationHistoryRepository.create({
          userId,
          deviceTokenId: token.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          status: result.success
            ? NotificationStatus.SENT
            : NotificationStatus.FAILED,
          fcmMessageId: result.messageId || null,
          error: result.error?.message || null,
          sentAt: result.success ? new Date() : null,
        });
        await this.notificationHistoryRepository.save(history);
      }
    } catch (error) {
      const message = error instanceof Error ? error.stack : String(error);
      this.logger.error('Error sending notification', message);
    }
  }

  /**
   * Send a broadcast notification to ALL registered device tokens.
   * Bypasses user preference checks - used for important announcements.
   * Sends to all active device tokens regardless of user.
   *
   * @param notification - Notification data to broadcast
   * @returns Object with sent and failed counts
   */
  async sendBroadcastNotification(
    notification: NotificationData,
  ): Promise<{ sentCount: number; failedCount: number }> {
    if (!this.firebaseApp) {
      this.logger.log(
        'Firebase not initialized, skipping broadcast notification',
      );
      return { sentCount: 0, failedCount: 0 };
    }

    // Get all active device tokens
    const allTokens = await this.deviceTokenRepository.find({
      where: { isActive: true },
    });

    if (allTokens.length === 0) {
      this.logger.log('No active device tokens found for broadcast');
      return { sentCount: 0, failedCount: 0 };
    }

    this.logger.log(
      `Broadcasting notification to ${allTokens.length} device tokens`,
    );

    let sentCount = 0;
    let failedCount = 0;

    // FCM has a limit of 500 tokens per multicast message
    const batchSize = 500;
    const batches: DeviceToken[][] = [];

    for (let i = 0; i < allTokens.length; i += batchSize) {
      batches.push(allTokens.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const deviceTokens = batch.map((t) => t.token);

      try {
        const message: admin.messaging.MulticastMessage = {
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data ? this.stringifyData(notification.data) : {},
          tokens: deviceTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Save notification history and count results
        for (let i = 0; i < batch.length; i++) {
          const token = batch[i];
          const result = response.responses[i];

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            // Mark token as inactive if it's no longer valid
            if (
              result.error?.code ===
                'messaging/registration-token-not-registered' ||
              result.error?.code === 'messaging/invalid-registration-token'
            ) {
              token.isActive = false;
              await this.deviceTokenRepository.save(token);
            }
          }

          // Save notification history
          const history = this.notificationHistoryRepository.create({
            userId: token.userId,
            deviceTokenId: token.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
            status: result.success
              ? NotificationStatus.SENT
              : NotificationStatus.FAILED,
            fcmMessageId: result.messageId || null,
            error: result.error?.message || null,
            sentAt: result.success ? new Date() : null,
          });
          await this.notificationHistoryRepository.save(history);
        }
      } catch (error) {
        this.logger.error('Error sending broadcast notification batch:', error);
        failedCount += batch.length;
      }
    }

    this.logger.log(
      `Broadcast notification completed: ${sentCount} sent, ${failedCount} failed`,
    );
    return { sentCount, failedCount };
  }

  /**
   * Check if a notification should be sent based on user preferences.
   * @param preferences - User notification preferences
   * @param type - Notification type
   * @returns True if notification should be sent
   */
  private shouldSendNotification(
    preferences: NotificationPreference,
    type: NotificationType,
  ): boolean {
    switch (type) {
      case NotificationType.EVENT_REMINDER:
        return preferences.eventReminders;
      case NotificationType.CONFIRMATION_DEADLINE:
        return preferences.confirmationDeadlines;
      case NotificationType.SUBSCRIPTION_UPDATE:
        return preferences.subscriptionUpdates;
      case NotificationType.RESERVATION_UPDATE:
        return preferences.reservationUpdates;
      case NotificationType.ADMIN_ALERT:
        return preferences.adminAlerts;
      case NotificationType.SCHEDULE_START:
        return preferences.eventReminders;
      case NotificationType.SCHEDULE_FINISHED:
        return preferences.eventReminders;
      default:
        return true;
    }
  }

  /**
   * Convert data object values to strings for FCM.
   * FCM data payload requires all values to be strings.
   * @param data - Data object to stringify
   * @returns Object with all string values
   */
  private stringifyData(data: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        result[key] = '';
      } else {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    return result;
  }
}
