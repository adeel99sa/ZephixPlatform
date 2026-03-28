import { resolve } from 'path';

function isProductionLikeRuntime(): boolean {
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  return nodeEnv === 'production' || nodeEnv === 'staging';
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
  if (isProductionLikeRuntime()) {
    return [resolve(runtimeSrcRoot, 'migrations', '*.js')];
  }

  return [
    resolve(runtimeSrcRoot, 'migrations', '*.js'),
    resolve(runtimeSrcRoot, 'migrations', '*.ts'),
  ];
}

