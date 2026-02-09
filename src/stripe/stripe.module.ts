import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeProduct } from './entities/stripe-product.entity';
import { StripePayment } from './entities/stripe-payment.entity';
import { StripePaymentMethod } from './entities/stripe-payment-method.entity';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { AuditModule } from '../audit/audit.module';
import { WalletModule } from '../wallet/wallet.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { CacheModule } from '../cache/cache.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StripeProduct,
      StripePayment,
      StripePaymentMethod,
    ]),
    AuditModule,
    WalletModule,
    StatisticsModule,
    CacheModule,
    WebsocketModule,
    EmailModule,
    forwardRef(() => SubscriptionsModule),
  ],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
