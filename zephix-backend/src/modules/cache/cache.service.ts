import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private cache = new Map<string, { value: any; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    try {
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
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      const expires = Date.now() + (ttl * 1000);
      this.cache.set(key, { value, expires });
      console.log(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`Cache SET error for ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      console.log(`Cache DELETE: ${key}`);
    } catch (error) {
      console.error(`Cache DELETE error for ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.clear();
      console.log('Cache CLEARED');
    } catch (error) {
      console.error('Cache CLEAR error:', error);
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
