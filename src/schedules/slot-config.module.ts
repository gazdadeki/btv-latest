import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotConfig } from './entities/slot-config.entity';
import { SlotConfigService } from './slot-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([SlotConfig])],
  providers: [SlotConfigService],
  exports: [SlotConfigService],
})
export class SlotConfigModule {}
