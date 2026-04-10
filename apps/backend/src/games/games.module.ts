import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { Slot } from './entities/slot.entity';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { SlotConfigModule } from '../schedules/slot-config.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigModule } from '../config/config.module';
import { CacheModule } from '../cache/cache.module';
import { GameCancellationService } from './game-cancellation.service';
import { GameBatchService } from './game-batch.service';
import { SlotAdminAssignmentService } from './slot-admin-assignment.service';
import { GameBulkWriteService } from './game-bulk-write.service';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Slot, Reservation, User]),
    AuditModule,
    forwardRef(() => WebsocketModule),
    forwardRef(() => SchedulesModule),
    SlotConfigModule,
    StatisticsModule,
    WalletModule,
    ConfigModule,
    CacheModule,
    StreamsModule,
  ],
  providers: [
    GamesService,
    GameCancellationService,
    GameBatchService,
    GameBulkWriteService,
    SlotAdminAssignmentService,
  ],
  controllers: [GamesController],
  exports: [
    GamesService,
    GameCancellationService,
    GameBatchService,
    GameBulkWriteService,
    SlotAdminAssignmentService,
  ],
})
export class GamesModule {}
