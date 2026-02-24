export function isSkipEmailVerificationEnabled(): boolean {
  const zephixEnv = String(process.env.ZEPHIX_ENV || '').toLowerCase();
  const skipEnv = String(process.env.SKIP_EMAIL_VERIFICATION || '').toLowerCase();
  return zephixEnv === 'staging' || skipEnv === 'true';
}

