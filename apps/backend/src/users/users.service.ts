import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, SelectQueryBuilder } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import type { Paginated } from '@btv/types';
import { User, UserRole, SubscriptionTier } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
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
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
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
    let saved: User;
    try {
      saved = await this.usersRepository.save(user);
    } catch (err) {
      // Backstop for the check-then-insert race in register/createUserWithRelations:
      // the UQ_users_username_active index (one active account per username) may
      // reject a row that passed the app-level findByUsername pre-check. Surface a
      // clean 409 instead of a raw 500.
      if (this.isDuplicateActiveUsername(err)) {
        throw new ConflictException(
          `User with username ${data.username} already exists`,
        );
      }
      throw err;
    }
    this.invalidateCache(saved);
    return saved;
  }

  /**
   * True when the error is a MySQL duplicate-key violation on the
   * single-active-username unique index (not e.g. the email index).
   */
  private isDuplicateActiveUsername(err: unknown): boolean {
    const e = err as { errno?: number; code?: string; message?: string };
    return (
      (e?.errno === 1062 || e?.code === 'ER_DUP_ENTRY') &&
      typeof e?.message === 'string' &&
      e.message.includes('UQ_users_username_active')
    );
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

  private buildFindAllQuery(filters?: {
    role?: UserRole;
    isVerified?: boolean;
    isBanned?: boolean;
    subscriptionTier?: SubscriptionTier;
    includeVoided?: boolean;
    search?: string;
  }): SelectQueryBuilder<User> {
    const query = this.usersRepository.createQueryBuilder('user');

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
    return query;
  }

  async findAll(filters?: {
    role?: UserRole;
    isVerified?: boolean;
    isBanned?: boolean;
    subscriptionTier?: SubscriptionTier;
    includeVoided?: boolean;
    search?: string;
  }): Promise<User[]> {
    return this.buildFindAllQuery(filters).getMany();
  }

  async findAllPaginated(
    filters: {
      role?: UserRole;
      isVerified?: boolean;
      isBanned?: boolean;
      subscriptionTier?: SubscriptionTier;
      includeVoided?: boolean;
      search?: string;
    },
    page: number,
    limit: number,
  ): Promise<Paginated<User>> {
    const query = this.buildFindAllQuery(filters)
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
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
      relations: ['wallet', 'statistics', 'subscription', 'avatar'],
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
      relations: ['wallet', 'statistics', 'subscription', 'avatar'],
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
      const cached = await this.findOne(cachedId);
      return cached.voidedAt ? null : cached;
    }

    const user = await this.usersRepository.findOne({
      where: { username, voidedAt: IsNull() },
      relations: ['wallet', 'statistics', 'subscription', 'avatar'],
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
   * Change a user's username. Unlike the generic `update()`, this evicts BOTH
   * the old and the new username cache keys — the freed name must read as
   * available again — and translates a `UQ_users_username_active` race into a
   * clean 409. Uniqueness/profanity are validated by the caller
   * (AuthService.changeUsername).
   */
  async updateUsername(userId: number, newUsername: string): Promise<User> {
    const user = await this.findOne(userId);
    const oldUsername = user.username;
    user.username = newUsername;

    let saved: User;
    try {
      saved = await this.usersRepository.save(user);
    } catch (err) {
      // `user` is likely the cached instance (findOne caches by id) and we
      // already mutated its username above. On failure, evict it so a rejected
      // rename never leaves the unsaved name in cache.
      this.invalidateCache(user);
      if (this.isDuplicateActiveUsername(err)) {
        throw new ConflictException(
          `User with username ${newUsername} already exists`,
        );
      }
      throw err;
    }

    if (oldUsername && oldUsername !== newUsername) {
      this.cacheService.del(this.cacheService.getUserUsernameKey(oldUsername));
    }
    this.invalidateCache(saved);
    return saved;
  }

  /**
   * Update only the avatar FK on a user. Uses a raw column UPDATE to bypass
   * TypeORM's entity save path, which can clobber the FK when the eager-loaded
   * `avatar` relation object is out of sync with the new `avatarId`.
   * Invalidates cache and re-loads the user so `avatar` is fresh.
   */
  async updateAvatar(userId: number, avatarId: number | null): Promise<User> {
    const existing = await this.findOne(userId);
    await this.usersRepository.update(userId, { avatarId });
    this.invalidateCache(existing);
    return this.findOne(userId);
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

    // Revoke all of the user's active refresh tokens so any in-flight
    // session is killed at the next refresh attempt.
    await this.refreshTokenRepository.update(
      { userId: id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

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

  /**
   * Daily hygiene job: lifts any temporary ban whose `bannedUntil` has passed.
   * The runtime NotBannedGuard already treats an expired temp ban as
   * non-enforcing, but this keeps the `isBanned` column truthful so admin
   * listings, filters, and analytics aren't lying about the user's status.
   * Permanent bans (bannedUntil IS NULL) are skipped.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireTemporaryBans(): Promise<void> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ isBanned: false, bannedUntil: null })
      .where(
        'isBanned = true AND bannedUntil IS NOT NULL AND bannedUntil <= :now',
        { now: new Date() },
      )
      .execute();
    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} temporary ban(s)`);
    }
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
