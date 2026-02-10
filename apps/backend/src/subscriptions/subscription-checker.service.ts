import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionCheckerService {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredSubscriptions() {
    await this.subscriptionsService.checkExpiredSubscriptions();
  }
}
