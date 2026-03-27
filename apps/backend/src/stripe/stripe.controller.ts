import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
  RawBodyRequest,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { RequireNotBanned } from '../common/decorators/require-not-banned.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import {
  StripePaymentStatus,
  StripePaymentType,
} from './entities/stripe-payment.entity';
import { StripeProductType } from './entities/stripe-product.entity';
import Stripe from 'stripe';

@ApiTags('Stripe')
@Controller()
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Get('admin/stripe/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all Stripe products with sync status' })
  @ApiResponse({ status: 200, description: 'List of products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getProducts() {
    const products = await this.stripeService.findAllProducts();
    return { products };
  }

  @Post('admin/stripe/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe product (syncs to Stripe)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async createProduct(
    @Body()
    body: {
      name: string;
      description?: string;
      type: 'SUBSCRIPTION' | 'COIN_PACK';
      productData: {
        tier?: string;
        billingPeriod?: 'MONTHLY' | 'SIX_MONTHS' | 'YEARLY';
        coins?: number;
        price: number;
      };
      displayOrder?: number;
    },
  ) {
    // Extract price from productData for service method
    return this.stripeService.createProduct({
      name: body.name,
      description: body.description,
      type: body.type as StripeProductType,
      productData: body.productData,
      price: body.productData.price,
      displayOrder: body.displayOrder,
    });
  }

  @Put('admin/stripe/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Stripe product (syncs to Stripe)' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      productData?: {
        price?: number;
        coins?: number;
        billingPeriod?: string;
        tier?: string;
      };
      isActive?: boolean;
      displayOrder?: number;
    },
  ) {
    // Convert productData to match service expectations
    const updateData: any = {
      name: body.name,
      description: body.description,
      isActive: body.isActive,
      displayOrder: body.displayOrder,
    };

    if (body.productData) {
      updateData.productData = body.productData;
    }

    return this.stripeService.updateProduct(+id, updateData);
  }

  @Delete('admin/stripe/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive Stripe product (syncs to Stripe)' })
  @ApiResponse({ status: 200, description: 'Product archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async archiveProduct(@Param('id') id: string) {
    await this.stripeService.archiveProduct(+id);
    return { message: 'Product archived successfully' };
  }

  @Post('admin/stripe/products/:id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually sync product to Stripe' })
  @ApiResponse({ status: 200, description: 'Product synced' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async syncProduct(@Param('id') id: string) {
    const product = await this.stripeService.syncProductToStripe(+id);
    return { message: 'Product synced successfully', product };
  }

  @Get('admin/stripe/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all Stripe payments with filters' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: StripePaymentStatus })
  @ApiQuery({ name: 'type', required: false, enum: StripePaymentType })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of payments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getPayments(
    @Query('userId') userId?: string,
    @Query('status') status?: StripePaymentStatus,
    @Query('type') type?: StripePaymentType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};
    if (userId) filters.userId = parseInt(userId, 10);
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.stripeService.findAllPayments(
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('admin/stripe/payments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe payment details' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('id') id: string) {
    return this.stripeService.findPaymentById(+id);
  }

  @Get('players/stripe/products')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available products (subscriptions and coin packs)',
  })
  @ApiResponse({ status: 200, description: 'Available products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async getAvailableProducts() {
    const products = await this.stripeService.findAllProducts();
    // Filter to only active, non-archived products
    const availableProducts = products.filter(
      (p) => p.isActive && !p.isArchived,
    );
    return { products: availableProducts };
  }

  @Post('players/stripe/payment-intent')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for coin pack purchase' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async createPaymentIntent(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      customerId?: string;
      paymentMethodId?: string;
    },
  ) {
    const clientSecret = await this.stripeService.createPaymentIntent(
      req.user.id,
      body.productId,
      body.customerId,
      body.paymentMethodId,
    );
    return { clientSecret };
  }

  @Get('players/stripe/payment-status/:paymentIntentId')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check payment status by payment intent ID',
    description:
      'Returns payment status. Optionally syncs from Stripe if sync=true query parameter is provided.',
  })
  @ApiQuery({
    name: 'sync',
    required: false,
    type: Boolean,
    description: 'If true, syncs payment status from Stripe before returning',
  })
  @ApiResponse({ status: 200, description: 'Payment status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(
    @Request() req: any,
    @Param('paymentIntentId') paymentIntentId: string,
    @Query('sync') sync?: string,
  ) {
    const payment =
      await this.stripeService.findPaymentByPaymentIntentId(paymentIntentId);

    if (!payment) {
      return { status: 'not_found' };
    }

    // Verify the payment belongs to the requesting user
    if (payment.userId !== req.user.id) {
      return { status: 'unauthorized' };
    }

    // If sync is requested, sync from Stripe
    if (sync === 'true' || sync === '1') {
      try {
        const syncResult =
          await this.stripeService.syncPaymentStatus(paymentIntentId);
        return {
          status: syncResult.payment.status,
          coinsGranted: syncResult.payment.coinsGranted,
          amount: syncResult.payment.amount,
          currency: syncResult.payment.currency,
          createdAt: syncResult.payment.createdAt.toISOString(),
          updatedAt: syncResult.payment.updatedAt.toISOString(),
          stripeStatus: syncResult.stripeStatus,
          wasUpdated: syncResult.wasUpdated,
          coinsGrantedDuringSync: syncResult.coinsGranted,
        };
      } catch (error) {
        // If sync fails, return current status anyway
        return {
          status: payment.status,
          coinsGranted: payment.coinsGranted,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
          syncError: error.message,
        };
      }
    }

    return {
      status: payment.status,
      coinsGranted: payment.coinsGranted,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  @Post('players/stripe/subscription-intent')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription setup intent' })
  @ApiResponse({ status: 201, description: 'Subscription intent created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async createSubscriptionIntent(
    @Request() req: any,
    @Body()
    body: {
      productId: number;
      customerId?: string;
      paymentMethodId?: string;
    },
  ) {
    const { subscriptionId, customerId, clientSecret } =
      await this.stripeService.createSubscription(
        req.user.id,
        body.productId,
        body.customerId,
        body.paymentMethodId,
      );
    return { subscriptionId, customerId, clientSecret };
  }

  @Post('players/stripe/setup-intent')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create setup intent for collecting payment methods',
  })
  @ApiResponse({ status: 201, description: 'Setup intent created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async createSetupIntent(
    @Request() req: any,
    @Body() body?: { customerId?: string },
  ) {
    const clientSecret = await this.stripeService.createSetupIntent(
      req.user.id,
      body?.customerId,
    );
    return { clientSecret };
  }

  @Post('players/stripe/sync-payment-status')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync payment status from Stripe',
    description:
      'Manually syncs payment status from Stripe API and updates local records. Useful if webhook failed or payment status is out of sync.',
  })
  @ApiResponse({ status: 200, description: 'Payment status synced' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async syncPaymentStatus(
    @Request() req: any,
    @Body() body: { paymentIntentId: string },
  ) {
    // Verify the payment belongs to the requesting user
    const payment = await this.stripeService.findPaymentByPaymentIntentId(
      body.paymentIntentId,
    );

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (payment.userId !== req.user.id) {
      throw new BadRequestException(
        'Unauthorized: Payment does not belong to you',
      );
    }

    const syncResult = await this.stripeService.syncPaymentStatus(
      body.paymentIntentId,
    );

    return {
      success: true,
      payment: {
        id: syncResult.payment.id,
        status: syncResult.payment.status,
        coinsGranted: syncResult.payment.coinsGranted,
        amount: syncResult.payment.amount,
        currency: syncResult.payment.currency,
        createdAt: syncResult.payment.createdAt.toISOString(),
        updatedAt: syncResult.payment.updatedAt.toISOString(),
      },
      stripeStatus: syncResult.stripeStatus,
      wasUpdated: syncResult.wasUpdated,
      coinsGrantedDuringSync: syncResult.coinsGranted,
    };
  }

  @Get('admin/users/:id/payment-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment methods for a user (admin)' })
  @ApiResponse({ status: 200, description: 'Payment methods' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAdminUserPaymentMethods(@Param('id') id: string) {
    const paymentMethods = await this.stripeService.getUserPaymentMethods(+id);
    return { paymentMethods };
  }

  @Get('players/stripe/payment-methods')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async getPlayerPaymentMethods(@Request() req: any) {
    const paymentMethods = await this.stripeService.getUserPaymentMethods(
      req.user.id,
    );
    return { paymentMethods };
  }

  @Post('players/stripe/payment-methods')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method attached' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async attachPaymentMethod(
    @Request() req: any,
    @Body() body: { paymentMethodId: string },
  ) {
    const paymentMethod = await this.stripeService.attachPaymentMethod(
      req.user.id,
      body.paymentMethodId,
    );
    return { paymentMethod };
  }

  @Delete('players/stripe/payment-methods/:id')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async detachPaymentMethod(@Param('id') id: string) {
    await this.stripeService.detachPaymentMethod(id);
    return { success: true };
  }

  @Put('players/stripe/payment-methods/:id/default')
  @UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiResponse({ status: 200, description: 'Default payment method set' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async setDefaultPaymentMethod(@Request() req: any, @Param('id') id: string) {
    await this.stripeService.setDefaultPaymentMethod(req.user.id, id);
    return { success: true };
  }

  @Post('admin/stripe/products/sync-from-stripe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync products from Stripe to local database' })
  @ApiResponse({ status: 200, description: 'Products synced from Stripe' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async syncProductsFromStripe() {
    const result = await this.stripeService.syncProductsFromStripe();
    return result;
  }

  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Request() req: RawBodyRequest<Request>,
  ) {
    this.logger.log('Received Stripe webhook request');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error(
        'STRIPE_WEBHOOK_SECRET environment variable is not set',
      );
      throw new Error(
        'STRIPE_WEBHOOK_SECRET environment variable is required for webhook verification',
      );
    }

    let event: Stripe.Event;
    try {
      // When using express.raw(), the body is available as req.body (Buffer)
      // For Stripe webhook signature verification, we need the raw body as Buffer
      const rawBody = (req as any).rawBody || req.body;

      if (!rawBody || !Buffer.isBuffer(rawBody)) {
        this.logger.error('Raw body is not available or not a Buffer');
        throw new Error(
          'Raw body is required for webhook signature verification',
        );
      }

      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      this.logger.log(
        `Webhook signature verified. Event type: ${event.type}, ID: ${event.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
        err.stack,
      );
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    try {
      await this.stripeService.handleWebhook(event);
      this.logger.log(
        `Webhook event ${event.type} (ID: ${event.id}) processed successfully`,
      );
      return { received: true };
    } catch (error) {
      this.logger.error(
        `Error processing webhook event ${event.type} (ID: ${event.id}): ${error.message}`,
        error.stack,
      );
      // Re-throw to ensure Stripe knows the webhook failed and will retry
      throw error;
    }
  }
}
