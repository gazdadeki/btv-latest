import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Game } from '../games/entities/game.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CalendarService } from './calendar.service';
import { ActivityModule } from '../activity/activity.module';
import { AuditModule } from '../audit/audit.module';
import { AuditController } from './audit.controller';
import { SchedulerModule } from '../scheduler/scheduler.module';

/**
 * Admin module for dashboard and administrative functions.
 *
 * Provides:
 * - Dashboard overview statistics
 * - Calendar view for events
 * - Audit log management
 * - Scheduler status
 *
 * All endpoints require admin role authentication.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, Game, User, Wallet, Subscription]),
    ActivityModule,
    AuditModule, // Import AuditModule to access AuditService
    SchedulerModule, // Import SchedulerModule to access SchedulerService
  ],
  providers: [AdminService, CalendarService],
  controllers: [AdminController, AuditController],
  exports: [AdminService, CalendarService],
})
export class AdminModule {}
