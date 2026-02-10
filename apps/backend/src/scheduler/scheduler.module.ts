import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Game } from '../games/entities/game.entity';
import { Slot } from '../games/entities/slot.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { SlotConfig } from '../schedules/entities/slot-config.entity';
import { SchedulerService } from './scheduler.service';
import { EventGenerationService } from './event-generation.service';
import { ConfirmationCheckerService } from './confirmation-checker.service';
import { GameGenerationService } from './game-generation.service';
import { GamePreAssignmentService } from './game-pre-assignment.service';
import { SchedulesModule } from '../schedules/schedules.module';
import { GamesModule } from '../games/games.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { SlotConfigModule } from '../schedules/slot-config.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, Game, Slot, Reservation, SlotConfig]),
    forwardRef(() => SchedulesModule),
    GamesModule,
    WalletModule,
    forwardRef(() => UsersModule),
    FirebaseModule,
    forwardRef(() => WebsocketModule),
    ReservationsModule,
    SlotConfigModule,
    AuditModule,
  ],
  providers: [
    SchedulerService,
    EventGenerationService,
    ConfirmationCheckerService,
    GameGenerationService,
    GamePreAssignmentService,
  ],
  exports: [SchedulerService, EventGenerationService],
})
export class SchedulerModule {}
