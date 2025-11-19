import { Injectable, Logger } from '@nestjs/common';

export interface LockOptions {
  ttl: number; // Time to live in milliseconds
  retryDelay?: number; // Delay between retry attempts
  maxRetries?: number; // Maximum number of retry attempts
}

export interface DistributedLock {
  release(): Promise<void>;
}

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly locks = new Map<
    string,
    { expiresAt: number; holder: string }
  >();

  async acquireLock(
    key: string,
    ttl: number,
    holder: string = 'default',
  ): Promise<DistributedLock | null> {
    const now = Date.now();
    const expiresAt = now + ttl;

    // Check if lock exists and is still valid
    const existingLock = this.locks.get(key);
    if (existingLock && existingLock.expiresAt > now) {
      this.logger.debug(
        `Lock ${key} is already held by ${existingLock.holder}`,
      );
      return null;
    }

    // Acquire the lock
    this.locks.set(key, { expiresAt, holder });
    this.logger.debug(`Lock ${key} acquired by ${holder}`);

    // Schedule automatic cleanup
    setTimeout(() => {
      this.cleanupExpiredLock(key);
    }, ttl);

    return {
      release: async () => {
        await this.releaseLock(key, holder);
      },
    };
  }

  async executeWithLock<T>(
    key: string,
    ttl: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    const lock = await this.acquireLock(key, ttl);

    if (!lock) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await operation();
    } finally {
      await lock.release();
    }
  }

  private async releaseLock(key: string, holder: string): Promise<void> {
    const lock = this.locks.get(key);

    if (lock && lock.holder === holder) {
      this.locks.delete(key);
      this.logger.debug(`Lock ${key} released by ${holder}`);
    } else {
      this.logger.warn(
        `Attempted to release lock ${key} by ${holder}, but lock is held by ${lock?.holder || 'unknown'}`,
      );
    }
  }

  private cleanupExpiredLock(key: string): void {
    const lock = this.locks.get(key);

    if (lock && lock.expiresAt <= Date.now()) {
      this.locks.delete(key);
      this.logger.debug(`Expired lock ${key} cleaned up`);
    }
  }

  // Cleanup method for testing and maintenance
  async cleanupAllExpiredLocks(): Promise<void> {
    const now = Date.now();
    const expiredKeys = Array.from(this.locks.entries())
      .filter(([_, lock]) => lock.expiresAt <= now)
      .map(([key, _]) => key);

    expiredKeys.forEach((key) => this.locks.delete(key));

    if (expiredKeys.length > 0) {
      this.logger.log(`Cleaned up ${expiredKeys.length} expired locks`);
    }
  }
}
