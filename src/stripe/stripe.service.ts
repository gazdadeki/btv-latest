import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Stripe from 'stripe';
import {
  StripeProduct,
  StripeProductType,
} from './entities/stripe-product.entity';
import {
  StripePayment,
  StripePaymentStatus,
  StripePaymentType,
} from './entities/stripe-payment.entity';
import { StripePaymentMethod } from './entities/stripe-payment-method.entity';
import { AuditService } from '../audit/audit.service';
import { WalletService } from '../wallet/wallet.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  SubscriptionStatus,
  SubscriptionTier,
} from '../subscriptions/entities/subscription.entity';
import { TransactionType } from '../wallet/entities/transaction.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { StatisticsService } from '../statistics/statistics.service';
import { User } from '../users/entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { WebsocketService } from '../websocket/websocket.service';
import { IEmailService } from '../email/email.service.interface';

type StripeInvoiceWithPaymentIntent = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null;
  subscription?: string | Stripe.Subscription | null;
};

type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(StripeProduct)
    private stripeProductRepository: Repository<StripeProduct>,
    @InjectRepository(StripePayment)
    private stripePaymentRepository: Repository<StripePayment>,
    @InjectRepository(StripePaymentMethod)
    private stripePaymentMethodRepository: Repository<StripePaymentMethod>,
    private auditService: AuditService,
    private walletService: WalletService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
    private statisticsService: StatisticsService,
    private dataSource: DataSource,
    private cacheService: CacheService,
    private websocketService: WebsocketService,
    @Inject('IEmailService')
    private emailService: IEmailService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createProduct(data: {
    name: string;
    description?: string;
    type: StripeProductType;
    productData: any;
    price: number;
    displayOrder?: number;
  }): Promise<StripeProduct> {
    // Create product in Stripe first
    const stripeProduct = await this.stripe.products.create({
      name: data.name,
      description: data.description,
      metadata: {
        type: data.type,
        productData: JSON.stringify(data.productData),
      },
    });

    // Create price in Stripe
    let stripePrice;
    if (data.type === StripeProductType.SUBSCRIPTION) {
      stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(data.price * 100),
        currency: 'usd',
        recurring: {
          interval:
            data.productData.billingPeriod === 'MONTHLY'
              ? 'month'
              : data.productData.billingPeriod === 'SIX_MONTHS'
                ? 'month'
                : 'year',
          interval_count:
            data.productData.billingPeriod === 'SIX_MONTHS' ? 6 : 1,
        },
      });
    } else {
      stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(data.price * 100),
        currency: 'usd',
      });
    }

    // Save product locally
    const product = this.stripeProductRepository.create({
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      name: data.name,
      description: data.description,
      type: data.type,
      productData: data.productData,
      isActive: true,
      displayOrder: data.displayOrder || 0,
    });

    const saved = await this.stripeProductRepository.save(product);

    await this.auditService.log({
      action: 'STRIPE_PRODUCT_CREATED',
      entityType: 'StripeProduct',
      entityId: saved.id.toString(),
      details: { productName: data.name, type: data.type },
    });

    return saved;
  }

  async findAllProducts(): Promise<StripeProduct[]> {
    const products = await this.stripeProductRepository.find({
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });

    // Check sync status for each product
    for (const product of products) {
      try {
        await this.stripe.products.retrieve(product.stripeProductId);
        // Product exists in Stripe, sync status is good
        product['syncStatus'] = 'synced';
      } catch {
        // Product not found in Stripe or error retrieving
        product['syncStatus'] = 'out_of_sync';
      }
    }

    return products;
  }

  async updateProduct(
    id: number,
    data: Partial<StripeProduct> & {
      productData?: Partial<StripeProduct['productData']> & { price?: number };
    },
  ): Promise<StripeProduct> {
    const product = await this.stripeProductRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Update product in Stripe
    if (data.name || data.description !== undefined) {
      await this.stripe.products.update(product.stripeProductId, {
        name: data.name || product.name,
        description:
          data.description !== undefined
            ? data.description
            : product.description,
      });
    }

    // Handle price updates - for subscriptions, create new price (prices are immutable)
    if (
      data.productData?.price &&
      data.productData.price !== product.productData.price
    ) {
      if (product.type === StripeProductType.SUBSCRIPTION) {
        // Create new price for subscription
        const newPrice = await this.stripe.prices.create({
          product: product.stripeProductId,
          unit_amount: Math.round(data.productData.price * 100),
          currency: 'usd',
          recurring: {
            interval:
              product.productData.billingPeriod === 'MONTHLY'
                ? 'month'
                : product.productData.billingPeriod === 'SIX_MONTHS'
                  ? 'month'
                  : 'year',
            interval_count:
              product.productData.billingPeriod === 'SIX_MONTHS' ? 6 : 1,
          },
        });
        product.stripePriceId = newPrice.id;
      } else {
        // For coin packs, create new price
        const newPrice = await this.stripe.prices.create({
          product: product.stripeProductId,
          unit_amount: Math.round(data.productData.price * 100),
          currency: 'usd',
        });
        product.stripePriceId = newPrice.id;
      }
    }

    // Update local product data
    if (data.productData) {
      product.productData = { ...product.productData, ...data.productData };
    }
    if (data.name) product.name = data.name;
    if (data.description !== undefined) product.description = data.description;
    if (data.isActive !== undefined) product.isActive = data.isActive;
    if (data.displayOrder !== undefined)
      product.displayOrder = data.displayOrder;

    return this.stripeProductRepository.save(product);
  }

  async syncProductToStripe(id: number): Promise<StripeProduct> {
    const product = await this.stripeProductRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    try {
      // Retrieve product from Stripe to verify it exists
      await this.stripe.products.retrieve(product.stripeProductId);

      // Update product in Stripe with current local data
      await this.stripe.products.update(product.stripeProductId, {
        name: product.name,
        description: product.description || '',
        active: product.isActive && !product.isArchived,
      });

      // If price changed, create new price
      if (product.stripePriceId) {
        try {
          const currentPrice = await this.stripe.prices.retrieve(
            product.stripePriceId,
          );
          const currentAmount = currentPrice.unit_amount / 100;
          if (currentAmount !== product.productData.price) {
            // Price changed, create new price
            if (product.type === StripeProductType.SUBSCRIPTION) {
              const newPrice = await this.stripe.prices.create({
                product: product.stripeProductId,
                unit_amount: Math.round(product.productData.price * 100),
                currency: 'usd',
                recurring: {
                  interval:
                    product.productData.billingPeriod === 'MONTHLY'
                      ? 'month'
                      : product.productData.billingPeriod === 'SIX_MONTHS'
                        ? 'month'
                        : 'year',
                  interval_count:
                    product.productData.billingPeriod === 'SIX_MONTHS' ? 6 : 1,
                },
              });
              product.stripePriceId = newPrice.id;
            } else {
              const newPrice = await this.stripe.prices.create({
                product: product.stripeProductId,
                unit_amount: Math.round(product.productData.price * 100),
                currency: 'usd',
              });
              product.stripePriceId = newPrice.id;
            }
            await this.stripeProductRepository.save(product);
          }
        } catch {
          // Price not found, create new one
          if (product.type === StripeProductType.SUBSCRIPTION) {
            const newPrice = await this.stripe.prices.create({
              product: product.stripeProductId,
              unit_amount: Math.round(product.productData.price * 100),
              currency: 'usd',
              recurring: {
                interval:
                  product.productData.billingPeriod === 'MONTHLY'
                    ? 'month'
                    : product.productData.billingPeriod === 'SIX_MONTHS'
                      ? 'month'
                      : 'year',
                interval_count:
                  product.productData.billingPeriod === 'SIX_MONTHS' ? 6 : 1,
              },
            });
            product.stripePriceId = newPrice.id;
          } else {
            const newPrice = await this.stripe.prices.create({
              product: product.stripeProductId,
              unit_amount: Math.round(product.productData.price * 100),
              currency: 'usd',
            });
            product.stripePriceId = newPrice.id;
          }
          await this.stripeProductRepository.save(product);
        }
      }

      return product;
    } catch (error) {
      throw new BadRequestException(
        `Failed to sync product to Stripe: ${error.message}`,
      );
    }
  }

  async getProductSyncStatus(
    id: number,
  ): Promise<{ synced: boolean; message?: string }> {
    const product = await this.stripeProductRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    try {
      const stripeProduct = await this.stripe.products.retrieve(
        product.stripeProductId,
      );

      // Check if product data matches
      const nameMatches = stripeProduct.name === product.name;
      const descriptionMatches =
        (stripeProduct.description || '') === (product.description || '');
      const activeMatches =
        stripeProduct.active === (product.isActive && !product.isArchived);

      if (nameMatches && descriptionMatches && activeMatches) {
        return { synced: true };
      } else {
        return {
          synced: false,
          message: 'Product data differs from Stripe',
        };
      }
    } catch (error) {
      return {
        synced: false,
        message: `Product not found in Stripe: ${error.message}`,
      };
    }
  }

  async archiveProduct(id: number): Promise<void> {
    const product = await this.stripeProductRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Archive in Stripe (set active=false, don't delete)
    try {
      await this.stripe.products.update(product.stripeProductId, {
        active: false,
      });
    } catch (error) {
      // Log error but continue with local archiving
      console.error(`Failed to archive product in Stripe: ${error.message}`);
    }

    product.isArchived = true;
    product.isActive = false;
    await this.stripeProductRepository.save(product);

    await this.auditService.log({
      action: 'STRIPE_PRODUCT_ARCHIVED',
      entityType: 'StripeProduct',
      entityId: id.toString(),
      details: { productName: product.name },
    });
  }

  async createPaymentIntent(
    userId: number,
    productId: number,
    customerId?: string,
    paymentMethodId?: string,
  ): Promise<string> {
    const product = await this.stripeProductRepository.findOne({
      where: { id: productId },
    });
    if (!product || !product.isActive) {
      throw new BadRequestException('Product not found or inactive');
    }

    let customer = customerId;
    if (!customer) {
      const user = await this.dataSource
        .getRepository(User)
        .findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.stripeCustomerId) {
        customer = user.stripeCustomerId;
      } else {
        const stripeCustomer = await this.stripe.customers.create({
          metadata: { userId: userId.toString() },
        });
        customer = stripeCustomer.id;
        await this.dataSource
          .getRepository(User)
          .update(userId, { stripeCustomerId: customer });
      }
    }

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(product.productData.price * 100),
      currency: 'usd',
      customer,
      metadata: {
        userId: userId.toString(),
        productId: productId.toString(),
        type: product.type,
      },
    };

    // If payment method is provided, attach it and confirm the payment intent
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirmation_method = 'automatic';
      paymentIntentParams.confirm = true;
      paymentIntentParams.return_url = 'btv://payment-return';
    }

    const paymentIntent =
      await this.stripe.paymentIntents.create(paymentIntentParams);

    // @ts-expect-error repository expects entity-like payload
    const payment = this.stripePaymentRepository.create({
      userId,
      stripeProductId: productId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer,
      type: product.type,
      status: StripePaymentStatus.PENDING,
      amount: product.productData.price,
      currency: 'usd',
    });
    await this.stripePaymentRepository.save(payment);

    return paymentIntent.client_secret!;
  }

  async createSubscription(
    userId: number,
    productId: number,
    customerId?: string,
    paymentMethodId?: string,
  ): Promise<{
    subscriptionId: string;
    customerId: string;
    clientSecret?: string;
  }> {
    const product = await this.stripeProductRepository.findOne({
      where: { id: productId },
    });
    if (
      !product ||
      product.type !== StripeProductType.SUBSCRIPTION ||
      !product.isActive
    ) {
      throw new BadRequestException('Invalid subscription product');
    }

    let customer = customerId;
    if (!customer) {
      const user = await this.dataSource
        .getRepository(User)
        .findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.stripeCustomerId) {
        customer = user.stripeCustomerId;
      } else {
        const stripeCustomer = await this.stripe.customers.create({
          metadata: { userId: userId.toString() },
        });
        customer = stripeCustomer.id;
        await this.dataSource
          .getRepository(User)
          .update(userId, { stripeCustomerId: customer });

        // Invalidate user cache to ensure fresh data on next fetch
        this.cacheService.del(this.cacheService.getUserKey(userId));
        this.cacheService.del(this.cacheService.getUserEmailKey(user.email));
        if (user.username) {
          this.cacheService.del(
            this.cacheService.getUserUsernameKey(user.username),
          );
        }
      }
    }

    // Validate and attach payment method if provided
    if (paymentMethodId) {
      try {
        // Verify payment method exists in Stripe
        const paymentMethod =
          await this.stripe.paymentMethods.retrieve(paymentMethodId);

        // Verify payment method is attached to the customer
        if (!paymentMethod.customer || paymentMethod.customer !== customer) {
          await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer,
          });
          this.logger.log(
            `Attached payment method ${paymentMethodId} to customer ${customer}`,
          );
        }

        // Set as default payment method for customer
        await this.stripe.customers.update(customer, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to validate/attach payment method ${paymentMethodId}: ${error.message}`,
          error.stack,
        );
        throw new BadRequestException(
          `Invalid payment method: ${error.message}`,
        );
      }
    } else {
      // Check if customer has any payment methods
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customer,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        throw new BadRequestException(
          'No payment method provided and customer has no saved payment methods. Please add a payment method first.',
        );
      }

      // Retrieve customer to get default payment method
      const stripeCustomer = await this.stripe.customers.retrieve(customer);

      // Use the default payment method if available, otherwise use the first one
      let defaultPaymentMethod = paymentMethods.data[0];

      // Check if customer is not deleted and has invoice_settings
      if (stripeCustomer && !stripeCustomer.deleted) {
        const customer = stripeCustomer as Stripe.Customer;
        if (customer.invoice_settings?.default_payment_method) {
          const defaultPmId = customer.invoice_settings
            .default_payment_method as string;
          const foundPm = paymentMethods.data.find(
            (pm) => pm.id === defaultPmId,
          );
          if (foundPm) {
            defaultPaymentMethod = foundPm;
          }
        }
      }

      paymentMethodId = defaultPaymentMethod.id;
      this.logger.log(
        `Using existing payment method ${paymentMethodId} for customer ${customer}`,
      );
    }

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer,
      items: [{ price: product.stripePriceId! }],
      metadata: {
        userId: userId.toString(),
        productId: productId.toString(),
      },
      default_payment_method: paymentMethodId,
      payment_behavior: 'default_incomplete', // This prevents immediate charge if payment fails
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
    };

    const subscription =
      await this.stripe.subscriptions.create(subscriptionParams);

    this.logger.log(
      `Created subscription ${subscription.id} for user ${userId} with payment method ${paymentMethodId}. Stripe status: ${subscription.status}, Latest invoice: ${subscription.latest_invoice || 'none'}`,
    );

    // Extract payment intent client secret if subscription is incomplete
    let clientSecret: string | undefined;
    if (
      subscription.status === 'incomplete' ||
      subscription.status === 'incomplete_expired'
    ) {
      try {
        // Expand latest_invoice if it's just an ID string
        let latestInvoice: StripeInvoiceWithPaymentIntent;
        if (typeof subscription.latest_invoice === 'string') {
          latestInvoice = await this.stripe.invoices.retrieve(
            subscription.latest_invoice,
            {
              expand: ['payment_intent'],
            },
          );
        } else {
          latestInvoice =
            subscription.latest_invoice as StripeInvoiceWithPaymentIntent;
        }

        // Extract client secret from payment intent
        if (latestInvoice.payment_intent) {
          const paymentIntent =
            typeof latestInvoice.payment_intent === 'string'
              ? await this.stripe.paymentIntents.retrieve(
                  latestInvoice.payment_intent,
                )
              : latestInvoice.payment_intent;

          if (paymentIntent.client_secret) {
            clientSecret = paymentIntent.client_secret;
            this.logger.log(
              `Extracted payment intent client secret for subscription ${subscription.id}. Flutter app should use this to confirm payment.`,
            );
          } else {
            this.logger.warn(
              `Subscription ${subscription.id} is incomplete but payment intent has no client secret. Payment confirmation may fail.`,
            );
          }
        } else {
          this.logger.warn(
            `Subscription ${subscription.id} is incomplete but latest invoice has no payment intent.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to extract payment intent client secret for subscription ${subscription.id}: ${error.message}`,
          error.stack,
        );
        // Don't throw - subscription was created successfully, just log the error
      }

      this.logger.log(
        `Subscription ${subscription.id} created with incomplete status. Payment will be attempted when payment method is confirmed via client secret. Subscription will activate via customer.subscription.updated or invoice.paid webhook when payment succeeds.`,
      );
    } else if (
      subscription.status === 'active' ||
      subscription.status === 'trialing'
    ) {
      this.logger.log(
        `Subscription ${subscription.id} created and immediately active. This is unusual with payment_behavior: 'default_incomplete' - payment may have succeeded immediately. No client secret needed.`,
      );
    }

    return {
      subscriptionId: subscription.id,
      customerId: customer,
      clientSecret,
    };
  }

  /**
   * Create a setup intent for collecting payment methods without immediate payment.
   * Used for saving payment methods for future use.
   *
   * @param userId - User ID
   * @param customerId - Optional Stripe customer ID (will create if not provided)
   * @returns Setup intent client secret
   */
  async createSetupIntent(
    userId: number,
    customerId?: string,
  ): Promise<string> {
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let customer = customerId || user.stripeCustomerId;
    if (!customer) {
      const stripeCustomer = await this.stripe.customers.create({
        metadata: { userId: userId.toString() },
      });
      customer = stripeCustomer.id;

      // Update user with Stripe customer ID
      await this.dataSource.getRepository(User).update(user.id, {
        stripeCustomerId: customer,
      });
    }

    const setupIntent = await this.stripe.setupIntents.create({
      customer,
      payment_method_types: ['card'],
      metadata: {
        userId: userId.toString(),
      },
    });

    return setupIntent.client_secret!;
  }

  /**
   * Updates a Stripe subscription.
   * Used for canceling subscriptions at period end or modifying subscription details.
   *
   * @param subscriptionId - The Stripe subscription ID
   * @param updateData - Data to update (e.g., cancel_at_period_end)
   * @returns The updated Stripe subscription object
   */
  async updateSubscription(
    subscriptionId: string,
    updateData: { cancel_at_period_end?: boolean },
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.update(subscriptionId, updateData);
  }

  /**
   * Handles Stripe webhook events.
   * Processes events asynchronously and logs all operations for debugging.
   *
   * @param event - The Stripe webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(
      `Received webhook event: ${event.type} (ID: ${event.id}, Livemode: ${event.livemode})`,
    );

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as StripeSubscriptionWithPeriods,
          );
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as StripeSubscriptionWithPeriods,
          );
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as StripeSubscriptionWithPeriods,
          );
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(
            event.data.object as StripeInvoiceWithPaymentIntent,
          );
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as StripeInvoiceWithPaymentIntent,
          );
          break;
        case 'invoice.payment_action_required':
          await this.handleInvoicePaymentActionRequired(
            event.data.object as StripeInvoiceWithPaymentIntent,
          );
          break;
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(
            event.data.object as Stripe.PaymentMethod,
          );
          break;
        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(
            event.data.object as Stripe.PaymentMethod,
          );
          break;
        default:
          this.logger.warn(
            `Unhandled webhook event type: ${event.type} (ID: ${event.id})`,
          );
          break;
      }

      this.logger.log(
        `Successfully processed webhook event: ${event.type} (ID: ${event.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing webhook event ${event.type} (ID: ${event.id}): ${error.message}`,
        error.stack,
      );
      // Re-throw to ensure Stripe knows the webhook failed
      // Stripe will retry the webhook if we return a non-2xx status
      throw error;
    }
  }

  /**
   * Handles successful payment intent for coin pack purchases.
   * Grants coins to user's wallet and creates transaction record.
   * Includes idempotency checks to prevent duplicate processing.
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Processing payment_intent.succeeded webhook for payment intent: ${paymentIntent.id}`,
    );

    const payment = await this.stripePaymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
      relations: ['stripeProduct', 'user'],
    });

    if (!payment) {
      this.logger.warn(
        `Payment record not found for payment intent: ${paymentIntent.id}. This may indicate a payment created outside the application.`,
      );
      return;
    }

    // Idempotency check: If payment is already succeeded, skip processing
    if (payment.status === StripePaymentStatus.SUCCEEDED) {
      this.logger.log(
        `Payment ${payment.id} (payment intent: ${paymentIntent.id}) is already marked as SUCCEEDED. Skipping duplicate processing.`,
      );

      // Double-check if transaction exists to ensure data consistency
      if (payment.stripeProduct.type === StripeProductType.COIN_PACK) {
        const existingTransaction = await this.dataSource
          .getRepository(Transaction)
          .findOne({
            where: {
              stripePaymentId: payment.id,
              type: TransactionType.STRIPE_PURCHASE,
            },
          });

        if (!existingTransaction) {
          this.logger.warn(
            `Payment ${payment.id} is marked as SUCCEEDED but no transaction record exists. This may indicate a previous processing failure.`,
          );
          // Attempt to create the missing transaction
          try {
            await this.processCoinPackPurchase(payment);
          } catch (error) {
            this.logger.error(
              `Failed to create missing transaction for payment ${payment.id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }

      return;
    }

    // Update payment status
    payment.status = StripePaymentStatus.SUCCEEDED;

    if (payment.stripeProduct.type === StripeProductType.COIN_PACK) {
      // Grant coins to wallet for coin pack purchases
      const coinsToGrant = payment.stripeProduct.productData.coins;

      // Validate coins to grant
      if (
        !coinsToGrant ||
        coinsToGrant <= 0 ||
        !Number.isFinite(coinsToGrant)
      ) {
        this.logger.error(
          `Invalid coins to grant for payment ${payment.id}: ${coinsToGrant}. Product data: ${JSON.stringify(payment.stripeProduct.productData)}`,
        );
        throw new BadRequestException(
          `Invalid coin amount in product configuration: ${coinsToGrant}`,
        );
      }

      payment.coinsGranted = coinsToGrant;

      try {
        await this.processCoinPackPurchase(payment);
      } catch (error) {
        this.logger.error(
          `Failed to process coin pack purchase for payment ${payment.id} (payment intent: ${paymentIntent.id}): ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    await this.stripePaymentRepository.save(payment);

    this.logger.log(
      `Successfully processed payment ${payment.id} (payment intent: ${paymentIntent.id}). Status: SUCCEEDED, Coins granted: ${payment.coinsGranted || 0}`,
    );

    await this.auditService.log({
      userId: payment.userId,
      action: 'STRIPE_PAYMENT_SUCCEEDED',
      entityType: 'StripePayment',
      entityId: payment.id.toString(),
      details: {
        type: payment.type,
        amount: payment.amount,
        coinsGranted: payment.coinsGranted,
      },
    });

    // Send payment receipt email
    try {
      const user = payment.user;
      if (user) {
        const amountInCents = Math.round(payment.amount * 100);
        const description = payment.stripeProduct
          ? payment.stripeProduct.name
          : 'BTV Purchase';
        await this.emailService.sendPaymentReceiptEmail(
          user.email,
          user.username,
          amountInCents,
          'USD',
          description,
        );
        this.logger.log(`Payment receipt email sent to: ${user.email}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send payment receipt email for payment ${payment.id}: ${error.message}`,
      );
    }
  }

  /**
   * Processes coin pack purchase: grants coins to wallet and creates transaction record.
   * Includes idempotency check to prevent duplicate transactions.
   *
   * @param payment - The StripePayment record to process
   */
  private async processCoinPackPurchase(payment: StripePayment): Promise<void> {
    // Idempotency check: Check if transaction already exists
    const existingTransaction = await this.dataSource
      .getRepository(Transaction)
      .findOne({
        where: {
          stripePaymentId: payment.id,
          type: TransactionType.STRIPE_PURCHASE,
        },
      });

    if (existingTransaction) {
      this.logger.log(
        `Transaction already exists for payment ${payment.id}. Skipping duplicate transaction creation.`,
      );
      return;
    }

    const wallet = await this.walletService.getWallet(payment.userId);
    const coinsToGrant = payment.stripeProduct.productData.coins;

    // Validate coins to grant before processing
    if (!coinsToGrant || coinsToGrant <= 0 || !Number.isFinite(coinsToGrant)) {
      this.logger.error(
        `Invalid coins to grant in processCoinPackPurchase for payment ${payment.id}: ${coinsToGrant}`,
      );
      throw new BadRequestException(
        `Invalid coin amount: ${coinsToGrant}. Cannot process purchase.`,
      );
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update wallet balance
      const walletEntity = await queryRunner.manager.findOne(Wallet, {
        where: { id: wallet.id },
      });
      if (!walletEntity) {
        throw new BadRequestException('Wallet not found');
      }

      const currentBalance = parseFloat(walletEntity.balance.toString());
      walletEntity.balance = currentBalance + coinsToGrant;
      await queryRunner.manager.save(walletEntity);

      // Create transaction record linking to Stripe payment
      const transactionDescription = `Stripe purchase: ${payment.stripeProduct.name} (${coinsToGrant} coins)`;
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.STRIPE_PURCHASE,
        amount: coinsToGrant,
        description: transactionDescription,
        stripePaymentId: payment.id,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Get updated wallet balance for WebSocket broadcast
      const updatedWallet = await this.walletService.getWallet(payment.userId);
      const newBalance = parseFloat(updatedWallet.balance.toString());

      this.logger.log(
        `Successfully granted ${coinsToGrant} coins to user ${payment.userId} (wallet ${wallet.id}) for payment ${payment.id}`,
      );

      // Invalidate user cache so the updated wallet balance is reflected
      this.cacheService.del(this.cacheService.getUserKey(payment.userId));

      // Update statistics after successful transaction (coins earned)
      await this.statisticsService.addCoinsEarned(payment.userId, coinsToGrant);

      // Broadcast wallet balance update via WebSocket to the user
      this.websocketService.broadcastToUser(
        payment.userId,
        'wallet:balance_updated',
        {
          userId: payment.userId,
          walletId: wallet.id,
          balance: newBalance,
          coinsAdded: coinsToGrant,
        },
      );

      // Broadcast transaction created event
      this.websocketService.broadcastToUser(
        payment.userId,
        'wallet:transaction_created',
        {
          transaction: {
            id: transaction.id,
            walletId: transaction.walletId,
            type: transaction.type,
            amount: parseFloat(transaction.amount.toString()),
            description: transaction.description,
            stripePaymentId: transaction.stripePaymentId,
            createdAt: transaction.createdAt.toISOString(),
          },
        },
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process coin pack purchase for payment ${payment.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Processing payment_intent.payment_failed webhook for payment intent: ${paymentIntent.id}`,
    );

    const payment = await this.stripePaymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(
        `Payment record not found for failed payment intent: ${paymentIntent.id}`,
      );
      return;
    }

    // Idempotency check: If already marked as failed, skip
    if (payment.status === StripePaymentStatus.FAILED) {
      this.logger.log(
        `Payment ${payment.id} is already marked as FAILED. Skipping duplicate processing.`,
      );
      return;
    }

    payment.status = StripePaymentStatus.FAILED;
    await this.stripePaymentRepository.save(payment);

    this.logger.log(
      `Payment ${payment.id} (payment intent: ${paymentIntent.id}) marked as FAILED`,
    );

    await this.auditService.log({
      userId: payment.userId,
      action: 'STRIPE_PAYMENT_FAILED',
      entityType: 'StripePayment',
      entityId: payment.id.toString(),
      details: {
        type: payment.type,
        amount: payment.amount,
        paymentIntentId: paymentIntent.id,
        lastPaymentError: paymentIntent.last_payment_error,
      },
    });
  }

  private async handleSubscriptionCreated(
    subscription: StripeSubscriptionWithPeriods,
  ): Promise<void> {
    this.logger.log(
      `Processing customer.subscription.created webhook for subscription: ${subscription.id}`,
    );
    try {
      await this.subscriptionsService.handleStripeSubscriptionCreated(
        subscription,
      );
      this.logger.log(
        `Successfully processed subscription creation for: ${subscription.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process subscription creation for ${subscription.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleSubscriptionUpdated(
    subscription: StripeSubscriptionWithPeriods,
  ): Promise<void> {
    this.logger.log(
      `Processing customer.subscription.updated webhook for subscription: ${subscription.id} (status: ${subscription.status})`,
    );

    const userId = parseInt(subscription.metadata?.userId || '0');
    if (!userId) {
      this.logger.warn(
        `Subscription ${subscription.id} has no userId in metadata`,
      );
      return;
    }

    // Find the subscription in our database
    const localSubscription =
      await this.subscriptionsService.getSubscriptionByStripeId(
        subscription.id,
      );

    if (!localSubscription) {
      this.logger.warn(
        `Subscription ${subscription.id} not found in database for user ${userId}`,
      );
      return;
    }

    const stripeStatus = subscription.status;
    const previousStatus = localSubscription.status;

    // Update subscription metadata
    localSubscription.stripeCustomerId = subscription.customer as string;
    if (subscription.current_period_start) {
      localSubscription.currentPeriodStart = new Date(
        subscription.current_period_start * 1000,
      );
    }
    if (subscription.current_period_end) {
      localSubscription.currentPeriodEnd = new Date(
        subscription.current_period_end * 1000,
      );
    }

    // Handle status transitions - key logic for activating subscriptions
    if (
      (stripeStatus === 'active' || stripeStatus === 'trialing') &&
      previousStatus === SubscriptionStatus.PENDING
    ) {
      // Subscription transitioned from incomplete/pending to active - activate it
      localSubscription.status = SubscriptionStatus.ACTIVE;

      // Update user tier to GOLD
      await this.dataSource.getRepository(User).update(userId, {
        subscriptionTier: SubscriptionTier.GOLD,
      });

      this.logger.log(
        `Activated subscription ${localSubscription.id} for user ${userId} - status changed from ${previousStatus} to ACTIVE (Stripe status: ${stripeStatus})`,
      );

      // Broadcast subscription activated event
      this.websocketService.broadcastToUser(userId, 'subscription:activated', {
        subscriptionId: localSubscription.id,
        status: localSubscription.status,
      });
    } else if (stripeStatus === 'active' || stripeStatus === 'trialing') {
      // Subscription is active, ensure local status is also active
      if (localSubscription.status !== SubscriptionStatus.ACTIVE) {
        localSubscription.status = SubscriptionStatus.ACTIVE;
        await this.dataSource.getRepository(User).update(userId, {
          subscriptionTier: SubscriptionTier.GOLD,
        });
        this.logger.log(
          `Updated subscription ${localSubscription.id} status to ACTIVE (was ${previousStatus})`,
        );
      }
    } else if (
      stripeStatus === 'incomplete' ||
      stripeStatus === 'incomplete_expired'
    ) {
      // Subscription is still incomplete - keep as PENDING
      if (localSubscription.status !== SubscriptionStatus.PENDING) {
        localSubscription.status = SubscriptionStatus.PENDING;
        this.logger.log(
          `Subscription ${localSubscription.id} status set to PENDING (Stripe status: ${stripeStatus})`,
        );
      }
    } else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') {
      // Subscription was canceled or unpaid
      if (localSubscription.status === SubscriptionStatus.ACTIVE) {
        localSubscription.status = SubscriptionStatus.EXPIRED;
        await this.dataSource.getRepository(User).update(userId, {
          subscriptionTier: SubscriptionTier.FREE,
        });
        this.logger.log(
          `Expired subscription ${localSubscription.id} for user ${userId} (Stripe status: ${stripeStatus})`,
        );
      }
    } else if (stripeStatus === 'past_due') {
      // Subscription is past due - keep active but log warning
      this.logger.warn(
        `Subscription ${localSubscription.id} is past due - payment required`,
      );
    }

    // Update cancel_at_period_end if present
    if (subscription.cancel_at_period_end !== undefined) {
      localSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      if (subscription.cancel_at_period_end && !localSubscription.canceledAt) {
        localSubscription.canceledAt = new Date();
      }
    }

    // Save updated subscription
    await this.subscriptionsService.updateSubscription(localSubscription);

    this.logger.log(
      `Updated subscription ${localSubscription.id} - Stripe status: ${stripeStatus}, Local status: ${localSubscription.status}`,
    );
  }

  private async handleSubscriptionDeleted(
    subscription: StripeSubscriptionWithPeriods,
  ): Promise<void> {
    this.logger.log(
      `Processing customer.subscription.deleted webhook for subscription: ${subscription.id}`,
    );
    try {
      await this.subscriptionsService.handleStripeSubscriptionDeleted(
        subscription,
      );
      this.logger.log(
        `Successfully processed subscription deletion for: ${subscription.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process subscription deletion for ${subscription.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleInvoicePaid(
    invoice: StripeInvoiceWithPaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Processing invoice.paid webhook for invoice: ${invoice.id}`,
    );

    if (!invoice.subscription) {
      this.logger.log(
        `Invoice ${invoice.id} paid (no subscription associated)`,
      );
      return;
    }

    const subscriptionId = invoice.subscription as string;
    this.logger.log(
      `Invoice ${invoice.id} paid for subscription: ${subscriptionId}`,
    );

    try {
      // Retrieve the subscription from Stripe to get current period info and verify status
      let stripeSubscription: StripeSubscriptionWithPeriods;
      try {
        stripeSubscription = (await this.stripe.subscriptions.retrieve(
          subscriptionId,
        )) as StripeSubscriptionWithPeriods;
      } catch (error) {
        this.logger.error(
          `Failed to retrieve subscription ${subscriptionId} from Stripe: ${error.message}`,
          error.stack,
        );
        throw error;
      }

      // Find the subscription in our database
      const subscription =
        await this.subscriptionsService.getSubscriptionByStripeId(
          subscriptionId,
        );

      if (!subscription) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found in database for invoice ${invoice.id}. This may be a subscription created outside the application.`,
        );
        return;
      }

      // Verify Stripe subscription status before activating
      const stripeStatus = stripeSubscription.status;
      this.logger.log(
        `Invoice ${invoice.id} paid - Subscription ${subscriptionId} status in Stripe: ${stripeStatus}, Local status: ${subscription.status}`,
      );

      // Update subscription periods from Stripe
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

      // Update customer ID if not set
      if (!subscription.stripeCustomerId) {
        subscription.stripeCustomerId = stripeSubscription.customer as string;
      }

      // Activate subscription if it's pending AND Stripe status confirms it's active
      // Only activate if Stripe subscription status is 'active' or 'trialing'
      if (
        subscription.status === SubscriptionStatus.PENDING &&
        (stripeStatus === 'active' || stripeStatus === 'trialing')
      ) {
        subscription.status = SubscriptionStatus.ACTIVE;
        const userId = subscription.userId;

        // Update user tier to GOLD
        await this.dataSource.getRepository(User).update(userId, {
          subscriptionTier: SubscriptionTier.GOLD,
        });

        this.logger.log(
          `Activated subscription ${subscription.id} for user ${userId} after first payment (Stripe status: ${stripeStatus})`,
        );

        // Broadcast subscription activated event
        this.websocketService.broadcastToUser(
          userId,
          'subscription:activated',
          {
            subscriptionId: subscription.id,
            status: subscription.status,
          },
        );
      } else if (
        subscription.status === SubscriptionStatus.PENDING &&
        stripeStatus !== 'active' &&
        stripeStatus !== 'trialing'
      ) {
        // Invoice paid but subscription still not active in Stripe (shouldn't happen, but handle gracefully)
        this.logger.warn(
          `Invoice ${invoice.id} paid but subscription ${subscriptionId} status is ${stripeStatus} (not active). Keeping subscription as PENDING.`,
        );
      } else if (
        subscription.status === SubscriptionStatus.ACTIVE &&
        (stripeStatus === 'active' || stripeStatus === 'trialing')
      ) {
        // Subscription already active - this is a renewal, just update periods
        this.logger.log(
          `Subscription ${subscription.id} renewed - updated periods`,
        );
      }

      await this.subscriptionsService.updateSubscription(subscription);

      this.logger.log(
        `Updated subscription ${subscription.id} - Periods: ${subscription.currentPeriodStart} to ${subscription.currentPeriodEnd}, Status: ${subscription.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process invoice.paid for subscription ${subscriptionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: StripeInvoiceWithPaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Processing invoice.payment_failed webhook for invoice: ${invoice.id}`,
    );
    // Handle failed subscription payment
    // Stripe will retry, but we can log the failure
    if (invoice.subscription) {
      const subscriptionId = invoice.subscription as string;
      this.logger.warn(
        `Invoice ${invoice.id} payment failed for subscription: ${subscriptionId}`,
      );
      // Could notify user or take action based on business logic
    } else {
      this.logger.warn(
        `Invoice ${invoice.id} payment failed (no subscription associated)`,
      );
    }
  }

  /**
   * Handles invoice.payment_action_required webhook event.
   * This occurs when payment requires additional action (e.g., 3D Secure authentication).
   * Subscription remains PENDING until payment is completed.
   *
   * @param invoice - The Stripe invoice object from webhook
   */
  private async handleInvoicePaymentActionRequired(
    invoice: StripeInvoiceWithPaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Processing invoice.payment_action_required webhook for invoice: ${invoice.id}`,
    );

    if (!invoice.subscription) {
      this.logger.log(
        `Invoice ${invoice.id} requires payment action (no subscription associated)`,
      );
      return;
    }

    const subscriptionId = invoice.subscription as string;
    this.logger.log(
      `Invoice ${invoice.id} requires payment action for subscription: ${subscriptionId}. This typically means 3D Secure or other authentication is required.`,
    );

    try {
      // Find the subscription in our database
      const subscription =
        await this.subscriptionsService.getSubscriptionByStripeId(
          subscriptionId,
        );

      if (!subscription) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found in database for invoice ${invoice.id}`,
        );
        return;
      }

      // Ensure subscription remains PENDING - don't activate until payment action is completed
      if (subscription.status !== SubscriptionStatus.PENDING) {
        this.logger.log(
          `Subscription ${subscription.id} status is ${subscription.status}, but payment action is required. Keeping status as-is.`,
        );
      } else {
        this.logger.log(
          `Subscription ${subscription.id} remains PENDING - waiting for payment action to complete`,
        );
      }

      // Log payment intent details if available for debugging
      if (invoice.payment_intent) {
        const paymentIntentId =
          typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent.id;
        this.logger.log(
          `Payment action required for payment intent: ${paymentIntentId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process invoice.payment_action_required for subscription ${subscriptionId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - this is informational, subscription will be updated when payment completes
    }
  }

  /**
   * Find all Stripe payments with optional filters and pagination.
   *
   * @param filters - Optional filters for payments
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated list of payments
   */
  async findAllPayments(
    filters?: {
      userId?: number;
      status?: StripePaymentStatus;
      type?: StripePaymentType;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: StripePayment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.stripePaymentRepository.createQueryBuilder('payment');

    if (filters?.userId) {
      query.andWhere('payment.userId = :userId', { userId: filters.userId });
    }
    if (filters?.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }
    if (filters?.type) {
      query.andWhere('payment.type = :type', { type: filters.type });
    }
    if (filters?.startDate) {
      query.andWhere('payment.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters?.endDate) {
      query.andWhere('payment.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    query
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.stripeProduct', 'stripeProduct')
      .leftJoinAndSelect('payment.subscription', 'subscription')
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find a payment by ID with all relations.
   *
   * @param id - Payment ID
   * @returns Payment with relations
   */
  /**
   * Get Stripe customer information
   *
   * @param customerId - Stripe customer ID
   * @returns Stripe customer object
   */
  async getCustomerInfo(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(
      customerId,
    ) as Promise<Stripe.Customer>;
  }

  /**
   * Create a Stripe customer for a user
   *
   * @param userId - User ID
   * @param email - User email (optional, will be fetched from user if not provided)
   * @returns Stripe customer ID
   */
  async createCustomerForUser(userId: number, email?: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: email,
      metadata: { userId: userId.toString() },
    });

    return customer.id;
  }

  /**
   * Find payment by Stripe payment intent ID.
   * Used to check payment status after creation.
   *
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Payment with relations or null if not found
   */
  async findPaymentByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<StripePayment | null> {
    return this.stripePaymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      relations: ['user', 'stripeProduct', 'subscription'],
    });
  }

  /**
   * Sync payment status from Stripe API to local database.
   * Retrieves the latest payment status from Stripe and updates local records.
   * If payment succeeded in Stripe but wasn't processed locally, processes it.
   *
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Updated payment status information
   */
  async syncPaymentStatus(paymentIntentId: string): Promise<{
    payment: StripePayment;
    stripeStatus: string;
    wasUpdated: boolean;
    coinsGranted?: number;
  }> {
    this.logger.log(
      `Syncing payment status from Stripe for payment intent: ${paymentIntentId}`,
    );

    // Retrieve payment intent from Stripe
    let stripePaymentIntent: Stripe.PaymentIntent;
    try {
      stripePaymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve payment intent ${paymentIntentId} from Stripe: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Payment intent not found in Stripe: ${error.message}`,
      );
    }

    // Find local payment record
    const payment = await this.stripePaymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      relations: ['stripeProduct', 'user'],
    });

    if (!payment) {
      this.logger.warn(
        `Local payment record not found for payment intent: ${paymentIntentId}`,
      );
      throw new BadRequestException(
        'Payment record not found in local database',
      );
    }

    const stripeStatus = stripePaymentIntent.status;
    const localStatus = payment.status;
    let wasUpdated = false;
    let coinsGranted: number | undefined;

    // Map Stripe status to local status
    // Note: PaymentIntent status values are: requires_payment_method, requires_confirmation,
    // requires_action, processing, requires_capture, canceled, succeeded
    // There is no 'payment_failed' status - failures are handled via webhook events
    let newLocalStatus: StripePaymentStatus;
    switch (stripeStatus) {
      case 'succeeded':
        newLocalStatus = StripePaymentStatus.SUCCEEDED;
        break;
      case 'canceled':
        newLocalStatus = StripePaymentStatus.CANCELED;
        break;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
      case 'requires_capture':
      default:
        newLocalStatus = StripePaymentStatus.PENDING;
        break;
    }

    // Update local status if it differs from Stripe
    if (localStatus !== newLocalStatus) {
      this.logger.log(
        `Payment status mismatch detected. Local: ${localStatus}, Stripe: ${stripeStatus}. Updating local status to ${newLocalStatus}`,
      );

      payment.status = newLocalStatus;
      wasUpdated = true;

      // If payment succeeded in Stripe but wasn't processed locally, process it
      if (
        newLocalStatus === StripePaymentStatus.SUCCEEDED &&
        payment.stripeProduct.type === StripeProductType.COIN_PACK
      ) {
        const coinsToGrant = payment.stripeProduct.productData.coins;

        // Validate coins to grant
        if (coinsToGrant && coinsToGrant > 0 && Number.isFinite(coinsToGrant)) {
          payment.coinsGranted = coinsToGrant;

          // Check if transaction already exists (idempotency)
          const existingTransaction = await this.dataSource
            .getRepository(Transaction)
            .findOne({
              where: {
                stripePaymentId: payment.id,
                type: TransactionType.STRIPE_PURCHASE,
              },
            });

          if (!existingTransaction) {
            try {
              await this.processCoinPackPurchase(payment);
              coinsGranted = coinsToGrant;
              this.logger.log(
                `Successfully granted ${coinsToGrant} coins to user ${payment.userId} during sync`,
              );
              // Cache invalidation is handled in processCoinPackPurchase
            } catch (error) {
              this.logger.error(
                `Failed to process coin pack purchase during sync for payment ${payment.id}: ${error.message}`,
                error.stack,
              );
              // Don't throw - we still want to update the payment status
            }
          } else {
            this.logger.log(
              `Transaction already exists for payment ${payment.id}. Skipping coin grant.`,
            );
            coinsGranted = coinsToGrant; // Return the amount that should have been granted
            // Still invalidate cache to ensure balance is fresh
            this.cacheService.del(this.cacheService.getUserKey(payment.userId));
          }
        } else {
          this.logger.error(
            `Invalid coins to grant during sync for payment ${payment.id}: ${coinsToGrant}`,
          );
        }
      }

      await this.stripePaymentRepository.save(payment);

      // Log audit trail
      await this.auditService.log({
        userId: payment.userId,
        action: 'STRIPE_PAYMENT_STATUS_SYNCED',
        entityType: 'StripePayment',
        entityId: payment.id.toString(),
        details: {
          previousStatus: localStatus,
          newStatus: newLocalStatus,
          stripeStatus: stripeStatus,
          coinsGranted: coinsGranted,
        },
      });
    } else {
      this.logger.log(
        `Payment ${payment.id} status is already in sync. Local: ${localStatus}, Stripe: ${stripeStatus}`,
      );
    }

    return {
      payment,
      stripeStatus,
      wasUpdated,
      coinsGranted,
    };
  }

  async findPaymentById(id: number): Promise<StripePayment> {
    const payment = await this.stripePaymentRepository.findOne({
      where: { id },
      relations: ['user', 'stripeProduct', 'subscription'],
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    return payment;
  }

  /**
   * Get all payment methods for a user
   *
   * @param userId - User ID
   * @returns Array of payment methods
   */
  async getUserPaymentMethods(userId: number): Promise<StripePaymentMethod[]> {
    return this.stripePaymentMethodRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Attach a payment method to a Stripe customer
   *
   * @param userId - User ID
   * @param paymentMethodId - Stripe payment method ID
   * @returns Created payment method record
   */
  async attachPaymentMethod(
    userId: number,
    paymentMethodId: string,
  ): Promise<StripePaymentMethod> {
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException(
        'User does not have a Stripe customer. Please create one first.',
      );
    }

    // Attach payment method to customer in Stripe
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Retrieve payment method details from Stripe
    const stripePaymentMethod =
      await this.stripe.paymentMethods.retrieve(paymentMethodId);

    // Extract card details if available
    const card = stripePaymentMethod.card;
    const paymentMethodData: Partial<StripePaymentMethod> = {
      userId,
      stripePaymentMethodId: paymentMethodId,
      type: stripePaymentMethod.type,
      last4: card?.last4 || null,
      brand: card?.brand || null,
      expMonth: card?.exp_month || null,
      expYear: card?.exp_year || null,
      isDefault: false,
    };

    // If this is the first payment method, make it default
    const existingMethods = await this.getUserPaymentMethods(userId);
    if (existingMethods.length === 0) {
      paymentMethodData.isDefault = true;
    }

    const paymentMethod =
      this.stripePaymentMethodRepository.create(paymentMethodData);
    return this.stripePaymentMethodRepository.save(paymentMethod);
  }

  /**
   * Detach a payment method from Stripe customer and remove from database
   *
   * @param paymentMethodId - Stripe payment method ID
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    const paymentMethod = await this.stripePaymentMethodRepository.findOne({
      where: { stripePaymentMethodId: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    // Detach from Stripe
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch {
      // Payment method might already be detached, continue with deletion
    }

    // If this was the default, set another one as default
    if (paymentMethod.isDefault) {
      const otherMethods = await this.stripePaymentMethodRepository.find({
        where: { userId: paymentMethod.userId },
      });
      if (otherMethods.length > 0) {
        const newDefault = otherMethods.find((m) => m.id !== paymentMethod.id);
        if (newDefault) {
          await this.stripePaymentMethodRepository.update(newDefault.id, {
            isDefault: true,
          });
        }
      }
    }

    // Remove from database
    await this.stripePaymentMethodRepository.remove(paymentMethod);
  }

  /**
   * Set a payment method as default
   *
   * @param userId - User ID
   * @param paymentMethodId - Stripe payment method ID
   */
  async setDefaultPaymentMethod(
    userId: number,
    paymentMethodId: string,
  ): Promise<void> {
    const paymentMethod = await this.stripePaymentMethodRepository.findOne({
      where: { stripePaymentMethodId: paymentMethodId, userId },
    });

    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    // Unset all other default payment methods for this user
    await this.stripePaymentMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Set this one as default
    await this.stripePaymentMethodRepository.update(paymentMethod.id, {
      isDefault: true,
    });

    // Also update in Stripe
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: userId } });

    if (user?.stripeCustomerId) {
      await this.stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }
  }

  /**
   * Sync products FROM Stripe to local database
   * Fetches all active products from Stripe and creates/updates local records
   *
   * @returns Sync summary with counts
   */
  async syncProductsFromStripe(): Promise<{
    created: number;
    updated: number;
    errors: string[];
  }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      // Fetch all active products from Stripe
      const stripeProducts = await this.stripe.products.list({
        active: true,
        limit: 100,
      });

      for (const stripeProduct of stripeProducts.data) {
        try {
          // Check if local product exists
          const existingProduct = await this.stripeProductRepository.findOne({
            where: { stripeProductId: stripeProduct.id },
          });

          // Get the default price for this product
          const prices = await this.stripe.prices.list({
            product: stripeProduct.id,
            active: true,
            limit: 1,
          });
          const defaultPrice = prices.data[0];

          if (!defaultPrice) {
            errors.push(
              `Product ${stripeProduct.name} (${stripeProduct.id}) has no active price`,
            );
            continue;
          }

          // Extract product data from metadata or infer from price
          const metadata = stripeProduct.metadata || {};
          let productData: any = {};
          let productType: StripeProductType;

          if (metadata.productData) {
            try {
              productData = JSON.parse(metadata.productData);
              productType =
                metadata.type === 'SUBSCRIPTION'
                  ? StripeProductType.SUBSCRIPTION
                  : StripeProductType.COIN_PACK;
            } catch {
              // Fallback to inferring from price
              productType = defaultPrice.recurring
                ? StripeProductType.SUBSCRIPTION
                : StripeProductType.COIN_PACK;
              productData.price = defaultPrice.unit_amount / 100;
            }
          } else {
            // Infer type from price
            productType = defaultPrice.recurring
              ? StripeProductType.SUBSCRIPTION
              : StripeProductType.COIN_PACK;
            productData.price = defaultPrice.unit_amount / 100;

            // Try to infer billing period for subscriptions
            if (
              productType === StripeProductType.SUBSCRIPTION &&
              defaultPrice.recurring
            ) {
              if (defaultPrice.recurring.interval === 'year') {
                productData.billingPeriod = 'YEARLY';
              } else if (
                defaultPrice.recurring.interval === 'month' &&
                defaultPrice.recurring.interval_count === 6
              ) {
                productData.billingPeriod = 'SIX_MONTHS';
              } else {
                productData.billingPeriod = 'MONTHLY';
              }
              productData.tier = 'GOLD';
            } else if (productType === StripeProductType.COIN_PACK) {
              // For coin packs, we can't infer coins from Stripe, so leave it empty
              productData.coins = null;
            }
          }

          if (existingProduct) {
            // Update existing product
            existingProduct.name = stripeProduct.name;
            existingProduct.description = stripeProduct.description || null;
            existingProduct.isActive = stripeProduct.active;
            existingProduct.stripePriceId = defaultPrice.id;
            if (productData.price) {
              existingProduct.productData = {
                ...existingProduct.productData,
                ...productData,
                price: productData.price,
              };
            }
            await this.stripeProductRepository.save(existingProduct);
            updated++;
          } else {
            // Create new product
            const newProduct = this.stripeProductRepository.create({
              stripeProductId: stripeProduct.id,
              stripePriceId: defaultPrice.id,
              name: stripeProduct.name,
              description: stripeProduct.description || null,
              type: productType,
              productData: productData,
              isActive: stripeProduct.active,
              displayOrder: 0,
            });
            await this.stripeProductRepository.save(newProduct);
            created++;
          }
        } catch (error) {
          errors.push(
            `Failed to sync product ${stripeProduct.name} (${stripeProduct.id}): ${error.message}`,
          );
        }
      }

      return { created, updated, errors };
    } catch (error) {
      throw new BadRequestException(
        `Failed to sync products from Stripe: ${error.message}`,
      );
    }
  }

  /**
   * Handle payment method attached webhook
   *
   * @param paymentMethod - Stripe payment method object
   */
  private async handlePaymentMethodAttached(
    paymentMethod: Stripe.PaymentMethod,
  ): Promise<void> {
    this.logger.log(
      `Processing payment_method.attached webhook for payment method: ${paymentMethod.id}`,
    );

    if (!paymentMethod.customer || typeof paymentMethod.customer !== 'string') {
      this.logger.warn(
        `Payment method ${paymentMethod.id} has no customer associated`,
      );
      return;
    }

    // Find user by Stripe customer ID
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { stripeCustomerId: paymentMethod.customer } });

    if (!user) {
      this.logger.warn(
        `User not found for customer: ${paymentMethod.customer}`,
      );
      return;
    }

    // Check if payment method already exists
    const existing = await this.stripePaymentMethodRepository.findOne({
      where: { stripePaymentMethodId: paymentMethod.id },
    });

    if (existing) {
      this.logger.log(
        `Payment method ${paymentMethod.id} already exists in database. Skipping.`,
      );
      return;
    }

    // Extract card details if available
    const card = paymentMethod.card;
    const paymentMethodData: Partial<StripePaymentMethod> = {
      userId: user.id,
      stripePaymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      last4: card?.last4 || null,
      brand: card?.brand || null,
      expMonth: card?.exp_month || null,
      expYear: card?.exp_year || null,
      isDefault: false,
    };

    // If this is the first payment method, make it default
    const existingMethods = await this.getUserPaymentMethods(user.id);
    if (existingMethods.length === 0) {
      paymentMethodData.isDefault = true;
    }

    const newPaymentMethod =
      this.stripePaymentMethodRepository.create(paymentMethodData);
    await this.stripePaymentMethodRepository.save(newPaymentMethod);

    this.logger.log(
      `Successfully attached payment method ${paymentMethod.id} for user ${user.id}`,
    );
  }

  /**
   * Handle payment method detached webhook
   *
   * @param paymentMethod - Stripe payment method object
   */
  private async handlePaymentMethodDetached(
    paymentMethod: Stripe.PaymentMethod,
  ): Promise<void> {
    this.logger.log(
      `Processing payment_method.detached webhook for payment method: ${paymentMethod.id}`,
    );

    const existing = await this.stripePaymentMethodRepository.findOne({
      where: { stripePaymentMethodId: paymentMethod.id },
    });

    if (!existing) {
      this.logger.log(
        `Payment method ${paymentMethod.id} not found in database. Already removed or never existed.`,
      );
      return;
    }

    // If this was the default, set another one as default
    if (existing.isDefault) {
      const otherMethods = await this.stripePaymentMethodRepository.find({
        where: { userId: existing.userId },
      });
      if (otherMethods.length > 0) {
        const newDefault = otherMethods.find((m) => m.id !== existing.id);
        if (newDefault) {
          await this.stripePaymentMethodRepository.update(newDefault.id, {
            isDefault: true,
          });
          this.logger.log(
            `Set payment method ${newDefault.id} as new default for user ${existing.userId}`,
          );
        }
      }
    }

    // Remove from database
    await this.stripePaymentMethodRepository.remove(existing);

    this.logger.log(
      `Successfully detached payment method ${paymentMethod.id} for user ${existing.userId}`,
    );
  }
}
