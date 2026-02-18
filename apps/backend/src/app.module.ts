import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VerificationModule } from './verification/verification.module';
import { WalletModule } from './wallet/wallet.module';
import { StripeModule } from './stripe/stripe.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SchedulesModule } from './schedules/schedules.module';
import { GamesModule } from './games/games.module';
import { ReservationsModule } from './reservations/reservations.module';
import { StatisticsModule } from './statistics/statistics.module';
import { AdminModule } from './admin/admin.module';
import { PlayersModule } from './players/players.module';
import { CacheModule } from './cache/cache.module';
import { ActivityModule } from './activity/activity.module';
import { WebsocketModule } from './websocket/websocket.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { EmailModule } from './email/email.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DownloadsModule } from './downloads/downloads.module';
import { MessagesModule } from './messages/messages.module';
import { TutorialsModule } from './tutorials/tutorials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Don't load .env file here - it's loaded manually in main.ts before app creation
      // This ensures env vars are available during module initialization
      ignoreEnvFile: false,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AppConfigModule,
    EmailModule,
    CacheModule,
    ActivityModule,
    AuthModule,
    UsersModule,
    VerificationModule,
    WalletModule,
    StripeModule,
    SubscriptionsModule,
    SchedulesModule,
    SchedulerModule,
    GamesModule,
    ReservationsModule,
    StatisticsModule,
    WebsocketModule,
    FirebaseModule,
    AuditModule,
    AdminModule,
    PlayersModule,
    DownloadsModule,
    MessagesModule,
    TutorialsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
