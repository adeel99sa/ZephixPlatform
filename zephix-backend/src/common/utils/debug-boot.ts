/**
 * Debug boot utilities for gating verbose startup logs behind DEBUG_BOOT env var.
 * Production logs should show only BOOT markers, warnings, and errors.
 * Set DEBUG_BOOT=true to enable detailed module initialization logs.
 */

/**
 * Returns true if DEBUG_BOOT environment variable is set to "true".
 */
export function isDebugBoot(): boolean {
  return process.env.DEBUG_BOOT === 'true';
}

/**
 * Logs to console only when DEBUG_BOOT=true.
 * Use for module initialization messages that add noise in production.
 */
export function bootLog(...args: unknown[]): void {
  if (isDebugBoot()) {
    console.log(...args);
  }
}

/**
 * Logs warning to console only when DEBUG_BOOT=true.
 * Use for non-critical warnings during startup that add noise in production.
 */
export function bootWarn(...args: unknown[]): void {
  if (isDebugBoot()) {
    console.warn(...args);
  }
}
