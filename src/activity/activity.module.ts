import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
