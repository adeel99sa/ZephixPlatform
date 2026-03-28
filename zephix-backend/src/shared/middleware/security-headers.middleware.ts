/**
 * Phase 3D: Security Headers Middleware
 *
 * Adds enterprise-grade security headers beyond what helmet provides.
 * These headers satisfy common enterprise security audit checklists.
 *
 * Already handled by helmet:
 *   - X-DNS-Prefetch-Control
 *   - X-Download-Options
 *   - X-Powered-By (removed)
 *
 * Added here:
 *   - Strict-Transport-Security (HSTS)
 *   - X-Content-Type-Options
 *   - X-Frame-Options
 *   - Referrer-Policy
 *   - Content-Security-Policy (basic)
 *   - Permissions-Policy
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    // HSTS: enforce HTTPS for 1 year, include subdomains
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Control referrer information leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Basic CSP for API backend (no inline scripts needed)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );

    // Restrict browser features
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    next();
  }
}
