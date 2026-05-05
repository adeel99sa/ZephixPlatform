import { resolve } from 'path';

function isProductionLikeRuntime(): boolean {
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  return nodeEnv === 'production';
}

function resolveRuntimeRoots(): {
  runtimeSrcRoot: string;
} {
  // src: <repo>/src/database
  // dist: <repo>/dist/src/database
  const runtimeSrcRoot = resolve(__dirname, '..');
  return { runtimeSrcRoot };
}

export function getMigrationsForRuntime(): string[] {
  const { runtimeSrcRoot } = resolveRuntimeRoots();
  // Support both compiled and source runtimes:
  // - start:prod can run with NODE_ENV=development in CI jobs
  // - start:dev/ts-node uses source .ts migrations
  //
  // IMPORTANT: Migration runner loads ONLY *.js and *.ts files. *.sql files in
  // src/migrations/ are NOT executed by the migration system and have historically
  // been dead code (see "task entity-DB drift" remediation, 2026-05-05 — drift
  // origin was `add-task-resource-fields.sql` that never ran, leaving the entity
  // and DB schema permanently out of sync).
  //
  // To add a real migration, write a *.ts file with proper TypeORM
  // MigrationInterface. To run raw SQL during a migration, use
  // `queryRunner.query(...)` inside the *.ts up()/down() methods.
  //
  // Other *.sql files in src/migrations/ at time of this comment are pending
  // separate audit dispatch — they may also be dead intent.
  if (isProductionLikeRuntime()) {
    return [resolve(runtimeSrcRoot, 'migrations', '*.js')];
  }

  return [
    resolve(runtimeSrcRoot, 'migrations', '*.js'),
    resolve(runtimeSrcRoot, 'migrations', '*.ts'),
  ];
}

