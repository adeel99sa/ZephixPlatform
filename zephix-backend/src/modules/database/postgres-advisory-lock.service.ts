import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PostgresAdvisoryLockService {
  private readonly logger = new Logger(PostgresAdvisoryLockService.name);
  constructor(private readonly dataSource: DataSource) {}

  async withLock<T>(lockId: number, fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    const start = Date.now();

    while (true) {
      const r = await this.dataSource.query('SELECT pg_try_advisory_lock($1) as ok', [lockId]);
      if (r?.[0]?.ok) break;

      if (Date.now() - start > timeoutMs) {
        throw new Error(`Lock timeout ${timeoutMs}ms`);
      }
      await new Promise((res) => setTimeout(res, 500));
    }

    try {
      this.logger.log(`lock_acquired=${lockId}`);
      return await fn();
    } finally {
      try {
        await this.dataSource.query('SELECT pg_advisory_unlock($1)', [lockId]);
      } catch {
        /* ignore */
      }
      this.logger.log(`lock_released=${lockId}`);
    }
  }
}
