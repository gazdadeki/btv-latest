import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export enum ActivityState {
  ONLINE = 'ONLINE',
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}

@Injectable()
export class ActivityService {
  constructor(private cacheService: CacheService) {}

  setActivityState(userId: number, state: ActivityState): void {
    const key = this.cacheService.getActivityKey(userId);
    this.cacheService.set(
      key,
      {
        state,
        lastActivity: new Date(),
      },
      30,
    ); // 30 second TTL for activity
  }

  getActivityState(userId: number): ActivityState {
    const key = this.cacheService.getActivityKey(userId);
    const cached = this.cacheService.get<{
      state: ActivityState;
      lastActivity: Date;
    }>(key);
    return cached?.state || ActivityState.OFFLINE;
  }

  updateLastActivity(userId: number): void {
    const currentState = this.getActivityState(userId);
    if (currentState === ActivityState.OFFLINE) {
      this.setActivityState(userId, ActivityState.ONLINE);
    } else {
      this.setActivityState(userId, ActivityState.ACTIVE);
    }
  }
}
