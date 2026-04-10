import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionCheckerService } from './subscription-checker.service';
import { UsersModule } from '../users/users.module';
import { StripeModule } from '../stripe/stripe.module';
import { AuditModule } from '../audit/audit.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    forwardRef(() => UsersModule),
    forwardRef(() => StripeModule),
    AuditModule,
    forwardRef(() => WebsocketModule),
    EmailModule,
  ],
  providers: [SubscriptionsService, SubscriptionCheckerService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
