import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../games/entities/game.entity';
import { Slot } from '../games/entities/slot.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Stream } from '../streams/entities/stream.entity';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Slot, Schedule, Stream]),
    ReservationsModule,
  ],
  providers: [PlayersService],
  controllers: [PlayersController],
  exports: [PlayersService],
})
export class PlayersModule {}
