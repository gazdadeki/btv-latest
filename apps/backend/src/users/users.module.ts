import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CacheModule } from '../cache/cache.module';
import { WalletModule } from '../wallet/wallet.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { AuditModule } from '../audit/audit.module';
import { StripeModule } from '../stripe/stripe.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { DatabaseSeedService } from '../database/database-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    CacheModule,
    WalletModule,
    StatisticsModule,
    AuditModule,
    forwardRef(() => StripeModule),
    forwardRef(() => ReservationsModule),
  ],
  providers: [UsersService, DatabaseSeedService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
