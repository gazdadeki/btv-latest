import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './entities/app-config.entity';

/**
 * Service for managing application configuration stored in the database.
 * Provides caching layer to reduce database queries for frequently accessed config values.
 *
 * Configuration keys are cached in memory after first access and can be invalidated
 * when updates occur. This service is initialized on module startup to preload
 * configuration values.
 */
@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);

  /**
   * In-memory cache for configuration values.
   * Key: configuration key string
   * Value: configuration value string
   */
  private cache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(AppConfig)
    private appConfigRepository: Repository<AppConfig>,
  ) {}

  /**
   * Initializes the service by loading all configuration values into cache.
   * Called automatically when the module is initialized.
   */
  async onModuleInit() {
    // await this.loadConfig();
  }

  /**
   * Loads all configuration values from the database into the cache.
   * This is called on module initialization and when cache is invalidated.
   *
   * @private
   */
  private async loadConfig() {
    const configs = await this.appConfigRepository.find();
    configs.forEach((config) => {
      this.cache.set(config.key, config.value);
    });
  }

  /**
   * Retrieves a configuration value by key.
   * First checks the cache, then queries the database if not found.
   *
   * @param key - The configuration key to retrieve
   * @param defaultValue - Optional default value if key doesn't exist
   * @returns The configuration value or default/empty string
   */
  async get(key: string, defaultValue?: string): Promise<string> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const config = await this.appConfigRepository.findOne({ where: { key } });
    if (config) {
      this.cache.set(key, config.value);
      return config.value;
    }
    return defaultValue || '';
  }

  /**
   * Sets or updates a configuration value.
   * Updates the database and cache atomically.
   *
   * @param key - The configuration key
   * @param value - The configuration value
   * @param description - Optional description of the configuration
   * @param updatedBy - Optional user ID who made the update
   */
  async set(
    key: string,
    value: string,
    description?: string,
    updatedBy?: number,
  ): Promise<void> {
    let config = await this.appConfigRepository.findOne({ where: { key } });
    if (config) {
      config.value = value;
      if (description) config.description = description;
      if (updatedBy) config.updatedBy = updatedBy;
    } else {
      config = this.appConfigRepository.create({
        key,
        value,
        description,
        updatedBy,
      });
    }
    await this.appConfigRepository.save(config);
    this.cache.set(key, value);
  }

  /**
   * Gets JWT access token expiry time from configuration.
   * Falls back to environment variable if not in database config.
   *
   * @returns Token expiry string (e.g., '15m', '1h')
   */
  getJwtAccessTokenExpiry(): string {
    const expiry =
      this.cache.get('jwt_access_token_expiry') ||
      process.env.JWT_ACCESS_TOKEN_EXPIRY!;
    this.logger.debug(`Retrieved JWT access token expiry: ${expiry}`);
    return expiry;
  }

  /**
   * Gets JWT refresh token expiry time from configuration.
   * Falls back to environment variable if not in database config.
   *
   * @returns Token expiry string (e.g., '7d', '30d')
   */
  getJwtRefreshTokenExpiry(): string {
    const expiry =
      this.cache.get('jwt_refresh_token_expiry') ||
      process.env.JWT_REFRESH_TOKEN_EXPIRY!;
    this.logger.debug(`Retrieved JWT refresh token expiry: ${expiry}`);
    return expiry;
  }

  /**
   * Gets verification code expiry time in minutes.
   * Defaults to 30 minutes if not configured.
   *
   * @returns Expiry time in minutes
   */
  getVerificationCodeExpiryMinutes(): number {
    return parseInt(this.cache.get('verification_code_expiry_minutes') || '30');
  }

  /**
   * Gets cache TTL (time to live) in seconds.
   * Defaults to 300 seconds (5 minutes) if not configured.
   *
   * @returns TTL in seconds
   */
  getCacheTtlSeconds(): number {
    return parseInt(this.cache.get('cache_ttl_seconds') || '300');
  }

  /**
   * Gets Gold subscription discount percentage.
   * Defaults to 15% if not configured.
   *
   * @returns Discount percentage (0-100)
   */
  getGoldDiscountPercentage(): number {
    return parseInt(this.cache.get('gold_discount_percentage') || '15');
  }

  /**
   * Gets subscription grace period in days.
   * Defaults to 0 days if not configured.
   *
   * @returns Grace period in days
   */
  getSubscriptionGracePeriodDays(): number {
    return parseInt(this.cache.get('subscription_grace_period_days') || '0');
  }

  /**
   * Gets audit log retention period in days.
   * Defaults to 90 days if not configured.
   *
   * @returns Retention period in days
   */
  getAuditLogRetentionDays(): number {
    return parseInt(this.cache.get('audit_log_retention_days') || '90');
  }

  /**
   * Gets user idle timeout in minutes.
   * Defaults to 5 minutes if not configured.
   *
   * @returns Idle timeout in minutes
   */
  getUserIdleMinutes(): number {
    return parseInt(this.cache.get('user_idle_minutes') || '5');
  }

  /**
   * Gets user away timeout in minutes.
   * Defaults to 30 minutes if not configured.
   *
   * @returns Away timeout in minutes
   */
  getUserAwayMinutes(): number {
    return parseInt(this.cache.get('user_away_minutes') || '30');
  }

  /**
   * Gets verification code request cooldown in seconds.
   * This prevents users from requesting verification codes too frequently.
   * Defaults to 60 seconds if not configured.
   *
   * @returns Cooldown period in seconds
   */
  getVerificationCodeCooldownSeconds(): number {
    return parseInt(
      this.cache.get('verification_code_cooldown_seconds') || '60',
    );
  }

  /**
   * Invalidates the configuration cache and reloads all values from the database.
   * Useful after bulk configuration updates.
   */
  invalidateCache() {
    this.cache.clear();
    this.loadConfig();
  }
}
