function readEnv(key: string): string {
  return String(process.env[key] || '').trim().toLowerCase();
}

export function getZephixEnv(): string {
  return readEnv('ZEPHIX_ENV');
}

export function isStagingRuntime(): boolean {
  return getZephixEnv() === 'staging';
}

export function isProductionRuntime(): boolean {
  return readEnv('NODE_ENV') === 'production';
}
