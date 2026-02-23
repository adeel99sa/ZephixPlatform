import { Request } from 'express';

/**
 * Resolves the client IP using Express's req.ip exclusively.
 *
 * We set `app.set('trust proxy', TRUST_PROXY_DEPTH)` at boot so Express
 * applies the rightmost-untrusted algorithm internally and populates
 * req.ip / req.ips. We rely on that single source of truth — no dual-path
 * header parsing.
 *
 * If Express trust proxy is not configured (depth=0), req.ip falls back
 * to the socket remote address, which is correct for direct connections.
 */
export function resolveClientIp(request: Request): string {
  const ip = request.ip;
  if (ip) {
    return ip.replace(/^::ffff:/, '');
  }
  return request.socket?.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
}

/**
 * Validates TRUST_PROXY_DEPTH at boot and logs the effective configuration.
 * Call this from main.ts after setting trust proxy.
 */
export function validateTrustProxyDepth(depth: number): void {
  if (depth < 0 || depth > 3) {
    console.error(
      `❌ TRUST_PROXY_DEPTH=${depth} is out of safe range [0..3]. ` +
        'Set to 1 for Railway, 2 for CloudFlare+Railway.',
    );
    process.exit(1);
    return;
  }

  const source =
    depth === 0
      ? 'socket remoteAddress (no proxy trust)'
      : `Express req.ip via trust proxy depth=${depth}`;

  console.log(
    `✅ TRUST_PROXY: depth=${depth} ipSource="${source}"`,
  );

  if (depth === 0 && process.env.NODE_ENV !== 'development') {
    console.warn(
      '⚠️  TRUST_PROXY_DEPTH=0 in non-development environment. ' +
        'If behind a reverse proxy, rate limiting will key on the proxy IP, not the client.',
    );
  }
}
