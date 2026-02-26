import { resolve } from 'path';

function isProductionLikeRuntime(): boolean {
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  return nodeEnv === 'production' || nodeEnv === 'staging';
}

function resolveRuntimeRoots(): {
  runtimeSrcRoot: string;
  runtimeDistRoot: string;
} {
  // src: <repo>/src/database
  // dist: <repo>/dist/src/database
  const runtimeSrcRoot = resolve(__dirname, '..');
  const runtimeDistRoot = resolve(runtimeSrcRoot, '..');
  return { runtimeSrcRoot, runtimeDistRoot };
}

export function getMigrationsForRuntime(): string[] {
  const { runtimeSrcRoot, runtimeDistRoot } = resolveRuntimeRoots();
  if (isProductionLikeRuntime()) {
    return [
      resolve(runtimeSrcRoot, 'migrations', '*.js'),
      resolve(runtimeDistRoot, 'migrations', '*.js'),
    ];
  }

  return [
    resolve(runtimeSrcRoot, 'migrations', '*.ts'),
    resolve(runtimeDistRoot, 'migrations', '*.ts'),
  ];
}

