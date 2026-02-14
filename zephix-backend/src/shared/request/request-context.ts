/**
 * Phase 3B: Minimal request context extraction for audit logging.
 * No new dependencies.
 */

/** Extract client IP from request, respecting X-Forwarded-For */
export function getRequestIp(req: any): string | null {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim() || null;
  }
  return req.ip || req.connection?.remoteAddress || null;
}

/** Extract user agent string, truncated to 512 chars */
export function getUserAgent(req: any): string | null {
  if (!req) return null;
  const ua = req.headers?.['user-agent'];
  if (typeof ua === 'string') {
    return ua.substring(0, 512);
  }
  return null;
}
