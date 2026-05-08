import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avatar } from './entities/avatar.entity';
import { AvatarsService } from './avatars.service';
import { AvatarsController } from './avatars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Avatar])],
  providers: [AvatarsService],
  controllers: [AvatarsController],
  exports: [AvatarsService],
})
export class AvatarsModule {}
