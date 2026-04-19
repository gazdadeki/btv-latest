import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationHistory } from './entities/notification-history.entity';
import { FirebaseService } from './firebase.service';
import { FirebaseController } from './firebase.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken, NotificationHistory])],
  providers: [FirebaseService],
  controllers: [FirebaseController],
  exports: [FirebaseService],
})
export class FirebaseModule {}
