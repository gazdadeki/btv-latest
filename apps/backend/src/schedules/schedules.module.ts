import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { SlotConfig } from './entities/slot-config.entity';
import { Game } from '../games/entities/game.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { AuditModule } from '../audit/audit.module';
import { SlotConfigModule } from './slot-config.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, SlotConfig, Game]),
    AuditModule,
    SlotConfigModule,
    forwardRef(() => SchedulerModule),
    forwardRef(() => GamesModule),
  ],
  providers: [SchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService],
})
export class SchedulesModule {}
