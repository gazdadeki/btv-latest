import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserRole,
  SubscriptionTier,
} from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { StatisticsService } from '../statistics/statistics.service';

/**
 * Database seeding service.
 * Creates default users (admin and player accounts) on application startup.
 * Only creates users if they don't already exist (based on email).
 *
 * This service runs automatically when the module is initialized.
 */
@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
    private statisticsService: StatisticsService,
  ) {}

  /**
   * Called automatically when the module is initialized.
   * Seeds the database with default users if they don't exist.
   */
  async onModuleInit() {
    const isProduction = process.env.NODE_ENV === 'production';
    // Default accounts share a well-known password, so they are a day-one
    // compromise in real prod. Production therefore skips seeding unless the
    // operator explicitly opts in. The override exists for pre-prod, which runs
    // with NODE_ENV=production but is a throwaway environment whose data never
    // migrates to prod. NEVER set SEED_DEFAULT_USERS in the real prod env.
    const forceSeed = process.env.SEED_DEFAULT_USERS === 'true';

    if (isProduction && !forceSeed) {
      this.logger.log('Skipping database seeding in production.');
      return;
    }

    if (isProduction && forceSeed) {
      this.logger.warn(
        'SEED_DEFAULT_USERS=true with NODE_ENV=production — seeding default ' +
          'accounts with a well-known password. Intended for PRE-PROD ONLY. ' +
          'If this is the real production environment, unset the flag now.',
      );
    }

    this.logger.log('Starting database seeding...');
    await this.seedUsers();
    this.logger.log('Database seeding completed.');
  }

  /**
   * Seeds the database with default admin and player users.
   * Creates users only if they don't already exist.
   */
  private async seedUsers() {
    const passwordHash = await bcrypt.hash('Test123#', 10);

    // Admin users
    const adminUsers = [
      {
        email: 'admin1@baltazartv.app',
        password: passwordHash,
        role: UserRole.ADMIN,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'admin2@baltazartv.app',
        password: passwordHash,
        role: UserRole.ADMIN,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
    ];

    // Player users — 10 FREE + 5 GOLD. Gold tier is set directly on the user row
    // because the reservation-limit logic reads `subscriptionTier`; seeded test
    // accounts intentionally have no backing Stripe subscription.
    const FREE_PLAYER_COUNT = 10;
    const GOLD_PLAYER_COUNT = 5;
    const playerUsers = [
      ...Array.from({ length: FREE_PLAYER_COUNT }, (_, i) => ({
        email: `player${i + 1}@baltazartv.app`,
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      })),
      ...Array.from({ length: GOLD_PLAYER_COUNT }, (_, i) => ({
        email: `gold${i + 1}@baltazartv.app`,
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.GOLD,
        isVerified: true,
      })),
    ];

    // Create admin users
    for (const adminData of adminUsers) {
      await this.createUserIfNotExists(adminData);
    }

    // Create player users
    for (const playerData of playerUsers) {
      await this.createUserIfNotExists(playerData);
    }
  }

  /**
   * Creates a user if it doesn't already exist.
   * Also creates associated wallet and statistics records.
   *
   * @param userData - User data to create
   */
  private async createUserIfNotExists(userData: {
    email: string;
    password: string;
    role: UserRole;
    subscriptionTier: SubscriptionTier;
    isVerified: boolean;
    username?: string;
  }) {
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      this.logger.log(
        `User ${userData.email} already exists, skipping creation.`,
      );
      return;
    }

    try {
      // Create user — derive username from email if not provided
      if (!userData.username) {
        userData.username = userData.email.split('@')[0];
      }
      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);

      // Create wallet for user
      await this.walletService.createWallet(savedUser.id);

      // Create statistics for user
      await this.statisticsService.createStatistics(savedUser.id);

      this.logger.log(`Created user: ${userData.email} (${userData.role})`);
    } catch (error) {
      this.logger.error(`Failed to create user ${userData.email}:`, error);
    }
  }
}
