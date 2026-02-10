import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Game, GameStatus } from '../games/entities/game.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { ActivityService, ActivityState } from '../activity/activity.service';

/**
 * Service for admin dashboard operations.
 * Provides aggregated statistics and metrics for the admin dashboard.
 *
 * Calculates key metrics including:
 * - Active schedules count
 * - Upcoming games count
 * - User statistics (total, verified, banned)
 * - Total coins in circulation
 * - Active subscriptions count
 * - Online users count
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private activityService: ActivityService,
  ) {}

  /**
   * Retrieves dashboard overview statistics.
   * Aggregates data from multiple sources to provide admin dashboard metrics.
   *
   * @returns Dashboard statistics object containing:
   * - activeSchedules: Count of active schedules
   * - upcomingGames: Count of games with CREATED status scheduled in the future
   * - totalUsers: Total user count
   * - verifiedUsers: Count of verified users
   * - bannedUsers: Count of banned users
   * - totalCoins: Sum of all wallet balances
   * - activeSubscriptions: Count of active subscriptions
   * - pendingSubscriptions: Count of pending subscriptions
   * - expiredSubscriptions: Count of expired subscriptions
   * - onlineUsers: Count of currently online users
   */
  async getDashboard() {
    const activeSchedules = await this.scheduleRepository.count({
      where: { isActive: true },
    });

    const upcomingGames = await this.gameRepository.count({
      where: {
        status: GameStatus.CREATED,
        scheduledStartTime: MoreThan(new Date()),
      },
    });

    const totalUsers = await this.userRepository.count();
    const verifiedUsers = await this.userRepository.count({
      where: { isVerified: true },
    });
    const bannedUsers = await this.userRepository.count({
      where: { isBanned: true },
    });

    // Calculate total coins in circulation across all wallets
    const wallets = await this.walletRepository
      .createQueryBuilder('wallet')
      .select('SUM(wallet.balance)', 'total')
      .getRawOne();
    const totalCoins = parseFloat(wallets?.total || '0');

    const activeSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const pendingSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.PENDING },
    });

    const expiredSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.EXPIRED },
    });

    // Count online users by checking activity state for all users
    const allUsers = await this.userRepository.find({ select: ['id'] });
    let onlineUsers = 0;
    for (const user of allUsers) {
      const activityState = this.activityService.getActivityState(user.id);
      if (
        activityState === ActivityState.ONLINE ||
        activityState === ActivityState.ACTIVE
      ) {
        onlineUsers++;
      }
    }

    return {
      activeSchedules,
      upcomingGames,
      totalUsers,
      verifiedUsers,
      bannedUsers,
      totalCoins,
      activeSubscriptions,
      pendingSubscriptions,
      expiredSubscriptions,
      onlineUsers,
    };
  }
}
