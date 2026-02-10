import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
} from './entities/subscription.entity';
import { UsersService } from '../users/users.service';
import { StripeService } from '../stripe/stripe.service';
import { AuditService } from '../audit/audit.service';
import { FirebaseService } from '../firebase/firebase.service';
import { WebsocketService } from '../websocket/websocket.service';
import { NotificationType } from '@/firebase/entities/notification-history.entity';
import { IEmailService } from '../email/email.service.interface';

/**
 * Service for managing user subscriptions.
 * Handles subscription creation, cancellation, and lifecycle management.
 * Integrates with Stripe for payment processing and subscription management.
 *
 * Features:
 * - Create Gold tier subscriptions
 * - Cancel subscriptions (scheduled for period end)
 * - Handle Stripe webhook events
 * - Check and expire subscriptions
 * - Real-time notifications via WebSocket and Firebase
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private usersService: UsersService,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
    private auditService: AuditService,
    private firebaseService: FirebaseService,
    private websocketService: WebsocketService,
    @Inject('IEmailService')
    private emailService: IEmailService,
  ) {}

  /**
   * Creates a new Gold tier subscription for a user.
   * Creates the subscription in Stripe first, then stores it in the database.
   *
   * @param userId - The user ID to create subscription for
   * @param productId - The Stripe product ID for the subscription
   * @returns The created subscription entity
   * @throws BadRequestException if user already has Gold subscription or active subscription exists
   */
  async createSubscription(
    userId: number,
    productId: number,
  ): Promise<Subscription> {
    const user = await this.usersService.findOne(userId);
    if (user.subscriptionTier === SubscriptionTier.GOLD) {
      throw new BadRequestException('User already has Gold subscription');
    }

    // Check if user already has an active or pending subscription
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException(
        'User already has an active subscription. Please cancel it before creating a new one.',
      );
    }

    // Check for pending subscriptions
    const pendingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.PENDING,
      },
    });

    if (pendingSubscription) {
      throw new BadRequestException(
        'User already has a pending subscription. Please wait for it to be activated or cancel it.',
      );
    }

    const { subscriptionId, customerId } =
      await this.stripeService.createSubscription(userId, productId);

    if (!customerId) {
      throw new BadRequestException(
        'Failed to create or retrieve Stripe customer for subscription',
      );
    }

    const subscription = this.subscriptionRepository.create({
      userId,
      tier: SubscriptionTier.GOLD,
      status: SubscriptionStatus.PENDING,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'SUBSCRIPTION_CREATED',
      entityType: 'Subscription',
      entityId: saved.id.toString(),
    });

    return saved;
  }

  /**
   * Gets all subscriptions with user relations.
   * Used by admin dashboard to list all subscriptions.
   *
   * @returns Array of all subscriptions with user information
   */
  async findAll(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancels a user's active subscription.
   * Schedules cancellation at period end in Stripe, allowing the user to
   * continue using the subscription until the billing period ends.
   *
   * @param userId - The user ID whose subscription to cancel
   * @throws BadRequestException if no active subscription found
   */
  async cancelSubscription(userId: number): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    if (subscription.stripeSubscriptionId) {
      // Cancel in Stripe - schedule cancellation at period end
      await this.stripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.canceledAt = new Date();
    await this.subscriptionRepository.save(subscription);

    const user = await this.usersService.findOne(userId);
    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'SUBSCRIPTION_CANCELLED',
      entityType: 'Subscription',
      entityId: subscription.id.toString(),
    });

    await this.firebaseService.sendNotification(userId, {
      type: NotificationType.SUBSCRIPTION_UPDATE,
      title: 'Subscription Cancelled',
      body: 'Your subscription will remain active until the end of the current billing period.',
    });

    await this.websocketService.broadcastToUser(
      userId,
      'subscription:updated',
      {
        subscriptionId: subscription.id,
        status: subscription.status,
      },
    );

    // Send subscription cancelled email
    try {
      const expiresAt = subscription.currentPeriodEnd || new Date();
      await this.emailService.sendSubscriptionCancelledEmail(
        user.email,
        user.username,
        expiresAt,
      );
      this.logger.log(`Subscription cancelled email sent to: ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send subscription cancelled email to: ${user.email}, error: ${error.message}`,
      );
    }
  }

  /**
   * Handles Stripe webhook event for subscription creation.
   * Updates subscription metadata but only activates if subscription status is 'active' or 'trialing'.
   * Subscriptions created with 'default_incomplete' payment behavior start as 'incomplete'
   * and should remain PENDING until payment succeeds and status becomes 'active'.
   *
   * @param stripeSubscription - The Stripe subscription object from webhook
   */
  async handleStripeSubscriptionCreated(
    stripeSubscription: any,
  ): Promise<void> {
    const userId = parseInt(stripeSubscription.metadata?.userId || '0');
    if (!userId) {
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    // Update metadata regardless of status
    subscription.stripeCustomerId = stripeSubscription.customer as string;

    // Only set period dates if they exist (they may not exist for incomplete subscriptions)
    if (stripeSubscription.current_period_start) {
      subscription.currentPeriodStart = new Date(
        stripeSubscription.current_period_start * 1000,
      );
    }
    if (stripeSubscription.current_period_end) {
      subscription.currentPeriodEnd = new Date(
        stripeSubscription.current_period_end * 1000,
      );
    }

    // Check Stripe subscription status - only activate if already active or trialing
    const stripeStatus = stripeSubscription.status;
    if (stripeStatus === 'active' || stripeStatus === 'trialing') {
      // Subscription is already active in Stripe, activate locally
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepository.save(subscription);

      await this.usersService.update(userId, {
        subscriptionTier: SubscriptionTier.GOLD,
      });

      // Send subscription confirmed email
      try {
        const user = await this.usersService.findOne(userId);
        const periodEnd = subscription.currentPeriodEnd || new Date();
        await this.emailService.sendSubscriptionConfirmedEmail(
          user.email,
          user.username,
          'Gold',
          periodEnd,
        );
        this.logger.log(`Subscription confirmed email sent to: ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to send subscription confirmed email for user ${userId}: ${error.message}`,
        );
      }
    } else if (
      stripeStatus === 'incomplete' ||
      stripeStatus === 'incomplete_expired' ||
      stripeStatus === 'past_due' ||
      stripeStatus === 'unpaid'
    ) {
      // Keep as PENDING - will be activated when payment succeeds via subscription.updated or invoice.paid
      subscription.status = SubscriptionStatus.PENDING;
      await this.subscriptionRepository.save(subscription);
    } else {
      // For other statuses (canceled, etc.), keep current status or set to PENDING
      if (subscription.status === SubscriptionStatus.PENDING) {
        await this.subscriptionRepository.save(subscription);
      }
    }
  }

  /**
   * Handles Stripe webhook event for subscription deletion.
   * Expires the subscription and downgrades user tier to Free.
   *
   * @param stripeSubscription - The Stripe subscription object from webhook
   */
  async handleStripeSubscriptionDeleted(
    stripeSubscription: any,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.EXPIRED;
      subscription.expiresAt = new Date();
      await this.subscriptionRepository.save(subscription);

      await this.usersService.update(subscription.userId, {
        subscriptionTier: SubscriptionTier.FREE,
      });
    }
  }

  /**
   * Gets the current active subscription for a user.
   *
   * @param userId - The user ID
   * @returns Current subscription or null if none
   */
  async getCurrentSubscription(userId: number): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId },
      relations: ['user', 'payments', 'payments.stripeProduct'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Gets subscription history for a user (all subscriptions).
   *
   * @param userId - The user ID
   * @returns Array of all subscriptions for the user
   */
  async getSubscriptionHistory(userId: number): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['user', 'payments', 'payments.stripeProduct'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Gets subscription by user ID (for admin).
   *
   * @param userId - The user ID
   * @returns Subscription or null
   */
  async findByUserId(userId: number): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  /**
   * Gets subscription by Stripe subscription ID.
   *
   * @param stripeSubscriptionId - The Stripe subscription ID
   * @returns Subscription or null
   */
  async getSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
      relations: ['user'],
    });
  }

  /**
   * Updates a subscription entity.
   *
   * @param subscription - The subscription entity to update
   * @returns Updated subscription
   */
  async updateSubscription(subscription: Subscription): Promise<Subscription> {
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Checks for expired subscriptions and updates their status.
   * Should be called periodically via cron job or scheduler.
   * Expires subscriptions whose currentPeriodEnd has passed.
   */
  async checkExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    const expired = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    for (const sub of expired) {
      if (sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
        sub.status = SubscriptionStatus.EXPIRED;
        await this.subscriptionRepository.save(sub);
        await this.usersService.update(sub.userId, {
          subscriptionTier: SubscriptionTier.FREE,
        });
      }
    }
  }
}
