import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value ?? null;
    } catch (error) {
      this.logger.error(`Cache GET error: ${key}`, error.message);
      return null;
    }
  }

  /**
   * Set value to cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key}, TTL: ${ttl || 'default'}ms`);
    } catch (error) {
      this.logger.error(`Cache SET error: ${key}`, error.message);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error: ${key}`, error.message);
    }
  }

  /**
   * Reset entire cache
   * Note: This is a best-effort approach since the Cache interface doesn't have a reset method
   */
  async reset(): Promise<void> {
    try {
      // Get all keys from the store (implementation depends on the store)
      // This is a simple implementation that works with Redis
      if ('store' in this.cacheManager && this.cacheManager.store) {
        // For Redis store, we can use the keys method if available
        const store = this.cacheManager.store as any;
        if (typeof store.keys === 'function') {
          const keys = await store.keys('*');
          await Promise.all(keys.map((key: string) => this.del(key)));
        }
      }
      this.logger.warn('Cache RESET: All cache cleared');
    } catch (error) {
      this.logger.error('Cache RESET error', error.message);
    }
  }

  /**
   * Wrap a function with caching (cache-aside pattern)
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    if (result !== null && result !== undefined) {
      await this.set(key, result, ttl);
    }
    return result;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return this.wrap(key, factory, ttl);
  }
}
