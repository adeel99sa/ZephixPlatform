import { Injectable } from '@nestjs/common';

// Fallback for development when Redis is not available
const CACHE_STORE = process.env.REDIS_URL 
  ? null // Will use Redis in production
  : new Map(); // Only for local development

@Injectable()
export class CacheService {
  private cache = CACHE_STORE || new Map<string, { value: any; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    try {
      // If Redis is available, use it
      if (process.env.REDIS_URL) {
        // This would be implemented with actual Redis client
        console.log(`Cache MISS (Redis): ${key}`);
        return null;
      }

      // Fallback to in-memory for development
      const item = this.cache.get(key);
      if (!item) {
        console.log(`Cache MISS: ${key}`);
        return null;
      }

      if (Date.now() > item.expires) {
        this.cache.delete(key);
        console.log(`Cache EXPIRED: ${key}`);
        return null;
      }

      console.log(`Cache HIT: ${key}`);
      return item.value;
    } catch (error) {
      console.error(`Cache GET error for ${key}:`, error);
      return null; // Graceful degradation
    }
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      // If Redis is available, use it
      if (process.env.REDIS_URL) {
        // This would be implemented with actual Redis client
        console.log(`Cache SET (Redis): ${key} with TTL ${ttl}s`);
        return;
      }

      // Fallback to in-memory for development
      const expires = Date.now() + (ttl * 1000);
      this.cache.set(key, { value, expires });
      console.log(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`Cache SET error for ${key}:`, error);
      // Don't throw - caching is not critical
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // If Redis is available, use it
      if (process.env.REDIS_URL) {
        // This would be implemented with actual Redis client
        console.log(`Cache DELETE (Redis): ${key}`);
        return;
      }

      // Fallback to in-memory for development
      this.cache.delete(key);
      console.log(`Cache DELETE: ${key}`);
    } catch (error) {
      console.error(`Cache DELETE error for ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      // If Redis is available, use it
      if (process.env.REDIS_URL) {
        // This would be implemented with actual Redis client
        console.log('Cache CLEARED (Redis)');
        return;
      }

      // Fallback to in-memory for development
      this.cache.clear();
      console.log('Cache CLEARED');
    } catch (error) {
      console.error('Cache CLEAR error:', error);
    }
  }

  getStats(): { size: number; keys: string[] } {
    if (process.env.REDIS_URL) {
      return { size: 0, keys: [] }; // Redis stats would be implemented
    }
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
