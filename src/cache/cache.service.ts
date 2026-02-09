import { Injectable, OnModuleInit } from '@nestjs/common';
import * as NodeCache from 'node-cache';
import { ConfigService } from '../config/config.service';

/**
 * Service for in-memory caching using node-cache.
 * Provides caching layer to reduce database queries and improve performance.
 *
 * Cache TTL (time to live) is configurable via AppConfig.
 * Supports custom TTL per cache entry or uses default TTL from configuration.
 *
 * Caching strategy:
 * - Users cached by ID, email, and username
 * - Cache invalidated on create/update/delete operations
 * - Reduces database queries for frequently accessed user data
 */
@Injectable()
export class CacheService implements OnModuleInit {
  /**
   * NodeCache instance for storing cached data.
   * Configured with TTL from application configuration.
   */
  private cache: NodeCache;

  constructor(private configService: ConfigService) {}

  /**
   * Initializes the cache service with configured TTL.
   * Called automatically when the module is initialized.
   */
  onModuleInit() {
    const ttl = this.configService.getCacheTtlSeconds();
    // Check period is 20% of TTL for efficient cleanup
    this.cache = new NodeCache({ stdTTL: ttl, checkperiod: ttl * 0.2 });
  }

  /**
   * Retrieves a value from cache by key.
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Stores a value in cache with optional custom TTL.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in seconds (uses default if not provided)
   * @returns True if successfully cached
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(
      key,
      value,
      ttl || this.configService.getCacheTtlSeconds(),
    );
  }

  /**
   * Deletes a value from cache by key.
   *
   * @param key - Cache key to delete
   * @returns Number of keys deleted
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clears all cached values.
   */
  flush(): void {
    this.cache.flushAll();
  }

  /**
   * Generates cache key for user by ID.
   *
   * @param userId - User ID
   * @returns Cache key string
   */
  getUserKey(userId: number): string {
    return `user:${userId}`;
  }

  /**
   * Generates cache key for user by email.
   *
   * @param email - User email
   * @returns Cache key string
   */
  getUserEmailKey(email: string): string {
    return `user:email:${email}`;
  }

  /**
   * Generates cache key for user by username.
   *
   * @param username - User username
   * @returns Cache key string
   */
  getUserUsernameKey(username: string): string {
    return `user:username:${username}`;
  }

  /**
   * Generates cache key for user activity tracking.
   *
   * @param userId - User ID
   * @returns Cache key string
   */
  getActivityKey(userId: number): string {
    return `activity:${userId}`;
  }

  /**
   * Generates cache key for Stripe product.
   *
   * @param productId - Stripe product ID
   * @returns Cache key string
   */
  getStripeProductKey(productId: number): string {
    return `stripe:product:${productId}`;
  }
}
