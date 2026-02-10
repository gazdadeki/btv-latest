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
    this.logger.log('Starting database seeding...');
    await this.seedUsers();
    this.logger.log('Database seeding completed.');
  }

  /**
   * Seeds the database with default admin and player users.
   * Creates users only if they don't already exist.
   */
  private async seedUsers() {
    const passwordHash = await bcrypt.hash('test123', 10);

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

    // Player users
    const playerUsers = [
      {
        email: 'player1@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player2@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player3@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player4@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player5@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player6@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player7@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player8@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player9@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
      {
        email: 'player10@baltazartv.app',
        password: passwordHash,
        role: UserRole.PLAYER,
        subscriptionTier: SubscriptionTier.FREE,
        isVerified: true,
      },
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
      // Create user
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
