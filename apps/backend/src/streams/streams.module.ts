import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stream } from './entities/stream.entity';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stream])],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
