import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, SubscriptionTier } from './entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { WalletService } from '../wallet/wallet.service';
import { StatisticsService } from '../statistics/statistics.service';
import { AuditService } from '../audit/audit.service';

/**
 * Service for managing user entities.
 * Provides CRUD operations with caching layer for improved performance.
 *
 * Caching strategy:
 * - Users cached by ID, email, and username
 * - Cache invalidated on create/update/delete operations
 * - Reduces database queries for frequently accessed user data
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private cacheService: CacheService,
    private walletService: WalletService,
    private statisticsService: StatisticsService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new user record.
   * Note: Does not create wallet/statistics. Use createUserWithRelations for complete user creation.
   *
   * @param data - User data to create
   * @returns Created user entity
   */
  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    const saved = await this.usersRepository.save(user);
    this.invalidateCache(saved);
    return saved;
  }

  /**
   * Create a new user with associated wallet and statistics records.
   * Used by admin API for creating complete user accounts.
   *
   * @param data - User creation data including email, password, role, etc.
   * @param adminId - ID of admin creating the user (for audit logging)
   * @param ipAddress - IP address of admin (for audit logging)
   * @returns Created user entity with relations
   * @throws ConflictException if user with email already exists
   */
  async createUserWithRelations(
    data: {
      email: string;
      password: string;
      username?: string;
      role?: UserRole;
      subscriptionTier?: SubscriptionTier;
      isVerified?: boolean;
    },
    adminId?: number,
    ipAddress?: string,
  ): Promise<User> {
    // Check if user already exists by email
    const existingUserByEmail = await this.findByEmail(data.email);
    if (existingUserByEmail) {
      throw new ConflictException(
        `User with email ${data.email} already exists`,
      );
    }

    // Check if username is provided and if it already exists
    if (data.username) {
      const existingUserByUsername = await this.findByUsername(data.username);
      if (existingUserByUsername) {
        throw new ConflictException(
          `User with username ${data.username} already exists`,
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    this.logger.debug(`Creating new user account for email: ${data.email}`);
    const user = await this.create({
      email: data.email,
      username: data.username || null,
      password: hashedPassword,
      role: data.role || UserRole.PLAYER,
      subscriptionTier: data.subscriptionTier || SubscriptionTier.FREE,
      isVerified: data.isVerified || false,
    });

    // Create wallet and statistics
    this.logger.debug(`Creating wallet and statistics for user ID: ${user.id}`);
    await this.walletService.createWallet(user.id);
    await this.statisticsService.createStatistics(user.id);

    // Audit log
    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_USER_CREATED',
      entityType: 'User',
      entityId: user.id.toString(),
      details: {
        createdUserEmail: user.email,
        createdUserRole: user.role,
        createdUserSubscriptionTier: user.subscriptionTier,
        createdUserIsVerified: user.isVerified,
      },
      ipAddress,
    });

    this.logger.log(
      `User created successfully: ID ${user.id}, email: ${user.email}`,
    );

    // Return user with relations
    return this.findOne(user.id);
  }

  async findAll(filters?: {
    role?: UserRole;
    isVerified?: boolean;
    isBanned?: boolean;
    subscriptionTier?: SubscriptionTier;
    includeVoided?: boolean;
    search?: string;
  }): Promise<User[]> {
    const query = this.usersRepository.createQueryBuilder('user');

    // By default, exclude voided users unless explicitly requested
    if (!filters?.includeVoided) {
      query.andWhere('user.isVoided = :isVoided', { isVoided: false });
    }

    if (filters?.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters?.isVerified !== undefined) {
      query.andWhere('user.isVerified = :isVerified', {
        isVerified: filters.isVerified,
      });
    }
    if (filters?.isBanned !== undefined) {
      query.andWhere('user.isBanned = :isBanned', {
        isBanned: filters.isBanned,
      });
    }
    if (filters?.subscriptionTier) {
      query.andWhere('user.subscriptionTier = :subscriptionTier', {
        subscriptionTier: filters.subscriptionTier,
      });
    }
    if (filters?.search) {
      query.andWhere(
        '(user.email LIKE :search OR user.username LIKE :search OR user.id = :searchId)',
        {
          search: `%${filters.search}%`,
          searchId: parseInt(filters.search, 10) || -1,
        },
      );
    }
    return query.getMany();
  }

  async findByIds(userIds: number[]): Promise<User[]> {
    if (userIds.length === 0) {
      return [];
    }
    return this.usersRepository.find({
      where: { id: In(userIds) },
    });
  }

  async findOne(id: number): Promise<User> {
    const cacheKey = this.cacheService.getUserKey(id);
    const cached = this.cacheService.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['wallet', 'statistics', 'subscription'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.cacheService.set(cacheKey, user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = this.cacheService.getUserEmailKey(email);
    const cachedId = this.cacheService.get<number>(cacheKey);
    if (cachedId) {
      return this.findOne(cachedId);
    }

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['wallet', 'statistics', 'subscription'],
    });
    if (user) {
      this.cacheService.set(cacheKey, user.id);
      this.cacheService.set(this.cacheService.getUserKey(user.id), user);
    }
    return user;
  }

  /**
   * Find a user by username.
   * Uses caching to improve performance for frequently accessed users.
   *
   * @param username - User username
   * @returns User entity or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    const cacheKey = this.cacheService.getUserUsernameKey(username);
    const cachedId = this.cacheService.get<number>(cacheKey);
    if (cachedId) {
      return this.findOne(cachedId);
    }

    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ['wallet', 'statistics', 'subscription'],
    });
    if (user) {
      this.cacheService.set(cacheKey, user.id);
      this.cacheService.set(this.cacheService.getUserKey(user.id), user);
    }
    return user;
  }

  /**
   * Find a user by email or username.
   * Attempts to find user by email first, then by username.
   * Used for login functionality where user can provide either identifier.
   *
   * @param identifier - Email or username
   * @returns User entity or null if not found
   */
  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    // Try email first
    const userByEmail = await this.findByEmail(identifier);
    if (userByEmail) {
      return userByEmail;
    }

    // Try username if email lookup failed
    return this.findByUsername(identifier);
  }

  /**
   * Update user information.
   * If password is provided in data, it will be hashed before saving.
   *
   * @param id - User ID to update
   * @param data - User data to update (password will be hashed if provided)
   * @returns Updated user entity
   */
  async update(id: number, data: Partial<User>): Promise<User> {
    const user = await this.findOne(id);

    // If password is being updated, hash it
    if (
      data.password &&
      typeof data.password === 'string' &&
      data.password.length > 0
    ) {
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      // Remove password from data if not provided or empty to avoid overwriting
      delete data.password;
    }

    Object.assign(user, data);
    const updated = await this.usersRepository.save(user);
    this.invalidateCache(updated);
    return updated;
  }

  /**
   * Remove user (hard delete - use voidUser for soft delete instead)
   * @deprecated Use voidUser instead for soft delete
   */
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    this.invalidateCache(user);
  }

  /**
   * Void (soft delete) a user.
   * Marks the user as voided instead of actually deleting from database.
   *
   * @param id - User ID to void
   * @param voidedBy - ID of admin voiding the user
   * @param reason - Reason for voiding (optional)
   * @param ipAddress - IP address for audit logging (optional)
   * @returns Updated user entity
   */
  async voidUser(
    id: number,
    voidedBy: number,
    reason: string | null = null,
    ipAddress?: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (user.isVoided) {
      throw new BadRequestException('User is already voided');
    }

    const updated = await this.update(id, {
      isVoided: true,
      voidedBy,
      voidedAt: new Date(),
      voidReason: reason,
    });

    // Audit log
    await this.auditService.log({
      userId: voidedBy,
      action: 'ADMIN_USER_VOIDED',
      entityType: 'User',
      entityId: id.toString(),
      details: {
        voidedUserEmail: user.email,
        voidReason: reason,
      },
      ipAddress,
    });

    this.logger.log(
      `User voided: ID ${id}, email: ${user.email}, voided by admin ID: ${voidedBy}`,
    );
    return updated;
  }

  private invalidateCache(user: User): void {
    this.cacheService.del(this.cacheService.getUserKey(user.id));
    this.cacheService.del(this.cacheService.getUserEmailKey(user.email));
    if (user.username) {
      this.cacheService.del(
        this.cacheService.getUserUsernameKey(user.username),
      );
    }
  }
}
