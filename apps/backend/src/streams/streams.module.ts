import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stream } from './entities/stream.entity';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { GamesModule } from '../games/games.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stream]),
    FirebaseModule,
    forwardRef(() => GamesModule),
    forwardRef(() => WebsocketModule),
  ],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
