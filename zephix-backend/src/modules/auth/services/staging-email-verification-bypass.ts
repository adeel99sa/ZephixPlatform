import { isStagingRuntime } from '../../../common/utils/runtime-env';

const BYPASS_FLAG = 'STAGING_SKIP_EMAIL_VERIFICATION';
const DOMAIN_ALLOWLIST = 'STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS';
const DEFAULT_ALLOWED_DOMAINS = ['zephix.local', 'example.com'] as const;

function readEnv(key: string): string {
  return String(process.env[key] || '').trim();
}

function isTrue(value: string): boolean {
  return value.toLowerCase() === 'true';
}

export function resolveRuntimeEnvironment(): string {
  return readEnv('ZEPHIX_ENV').toLowerCase();
}

export function isStagingEmailVerificationBypassFlagEnabled(): boolean {
  return isTrue(readEnv(BYPASS_FLAG));
}

export function getStagingBypassAllowedDomains(): string[] {
  const configured = readEnv(DOMAIN_ALLOWLIST);
  if (!configured) return [...DEFAULT_ALLOWED_DOMAINS];
  const parsed = configured
    .split(',')
    .map((part) => part.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_DOMAINS];
}

export function isAllowedBypassEmailDomain(email: string): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) return false;
  const domain = normalizedEmail.slice(atIndex + 1).trim();
  if (!domain) return false;
  // Exact domain match only; no partial or suffix matching.
  return getStagingBypassAllowedDomains().includes(domain);
}

export function shouldBypassEmailVerificationForEmail(email: string): boolean {
  return (
    isStagingRuntime() &&
    isStagingEmailVerificationBypassFlagEnabled() &&
    isAllowedBypassEmailDomain(email)
  );
}

export function assertStagingEmailVerificationBypassGuardrails(): void {
  if (isStagingEmailVerificationBypassFlagEnabled() && !isStagingRuntime()) {
    throw new Error(
      `${BYPASS_FLAG}=true is only allowed when runtime environment is staging`,
    );
  }
}
