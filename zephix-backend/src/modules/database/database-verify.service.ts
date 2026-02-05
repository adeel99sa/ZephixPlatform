import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';
import {
  AUTH_REQUIRED_TABLES,
  AUTH_REQUIRED_COLUMNS,
} from '../auth/auth-schema.contract';

type VerifyResult = {
  ok: boolean;
  pendingMigrations: string[];
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  loadedMigrations: number;
};

@Injectable()
export class DatabaseVerifyService {
  private readonly logger = new Logger(DatabaseVerifyService.name);
  private cached: { at: number; value: VerifyResult } | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly lock: PostgresAdvisoryLockService,
  ) {}

  private async tableExists(name: string): Promise<boolean> {
    const r = await this.dataSource.query(`SELECT to_regclass($1) as t`, [
      `public.${name}`,
    ]);
    return !!r?.[0]?.t;
  }

  private async pendingMigrations(): Promise<string[]> {
    const loaded = (this.dataSource.migrations || []).map(
      (m: { name?: string; constructor?: { name?: string } }) =>
        m.name ?? (m.constructor as { name?: string })?.name ?? '',
    );
    // Do not throw on 0 loaded; fail only when pending migrations exist or schema is incompatible.
    if (loaded.length === 0) {
      this.logger.warn(
        'loaded_migrations=0; cannot compute pending. Fix DataSource migrations path (e.g. process.cwd() + dist/migrations/*.js).',
      );
      return [];
    }

    const has = await this.tableExists('migrations');
    if (!has) return loaded;

    const rows = await this.dataSource.query(
      `SELECT name FROM migrations ORDER BY id ASC`,
    );
    const executed = new Set((rows as { name: string }[]).map((r) => r.name));
    return loaded.filter((n: string) => !executed.has(n));
  }

  private async missingTables(): Promise<string[]> {
    const missing: string[] = [];
    for (const t of AUTH_REQUIRED_TABLES) {
      if (!(await this.tableExists(t))) missing.push(t);
    }
    return missing;
  }

  private async missingColumns(): Promise<
    Array<{ table: string; column: string }>
  > {
    const missing: Array<{ table: string; column: string }> = [];
    for (const c of AUTH_REQUIRED_COLUMNS) {
      const r = await this.dataSource.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema='public'
           AND table_name=$1
           AND column_name=$2
         LIMIT 1`,
        [c.table, c.column],
      );
      if (!r?.length) missing.push(c);
    }
    return missing;
  }

  async verify(ttlMs: number): Promise<VerifyResult> {
    const now = Date.now();
    // Only use cache for success; never serve a stale failure so readiness can flip to 200 after schema is fixed.
    if (this.cached?.value.ok && now - this.cached.at < ttlMs)
      return this.cached.value;

    const loadedMigrations = this.dataSource.migrations?.length ?? 0;
    const pending = await this.pendingMigrations();
    const tables = await this.missingTables();
    const cols = await this.missingColumns();

    const value: VerifyResult = {
      ok: pending.length === 0 && tables.length === 0 && cols.length === 0,
      pendingMigrations: pending,
      missingTables: tables,
      missingColumns: cols,
      loadedMigrations,
    };

    if (value.ok) this.cached = { at: now, value };
    else this.cached = null;
    return value;
  }

  async verifyOnBoot(): Promise<void> {
    const env = process.env.NODE_ENV || 'development';
    const auto = process.env.AUTO_MIGRATE === 'true';
    const lockId = 193847561; // stable constant
    const timeoutMs = Number(process.env.MIGRATION_LOCK_TIMEOUT_MS || 60000);

    const migrations = this.dataSource.migrations || [];
    const count = migrations.length;
    const names = migrations.map(
      (m: { name?: string; constructor?: { name?: string } }) =>
        m.name ?? (m.constructor as { name?: string })?.name ?? '',
    );
    const first = names[0] ?? '(none)';
    const last = names[names.length - 1] ?? '(none)';
    this.logger.log(`migrations_loaded=${count} first=${first} last=${last}`);

    if (env === 'development' && auto) {
      await this.lock.withLock(
        lockId,
        async () => {
          const pre = await this.verify(0);
          if (pre.pendingMigrations.length > 0) {
            this.logger.warn(
              `pending_migrations=${pre.pendingMigrations.length} running=true`,
            );
            await this.dataSource.runMigrations({ transaction: 'all' });
          }
        },
        timeoutMs,
      );
    }

    const result = await this.verify(0);
    if (!result.ok) {
      this.logger.error(`schema_verify_failed env=${env}`);
      this.logger.error(JSON.stringify(result));
      // In production, do not exit: keep server running so /api/health/ready returns 503 with details.
      const failFast = process.env.FAIL_FAST_SCHEMA_VERIFY === 'true';
      if (failFast || env !== 'production') {
        throw new Error('Schema verification failed');
      }
      this.logger.warn(
        'Schema verification failed but FAIL_FAST_SCHEMA_VERIFY is not set; continuing. /api/health/ready will return 503.',
      );
      return;
    }

    this.logger.log('schema_verify_ok');
  }
}
