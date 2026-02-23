import { Injectable } from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { randomBytes } from 'crypto';

@Injectable()
export class CsrfService {
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  deriveSecureCookieFlag(req: ExpressRequest): boolean {
    const hostHeader = req.headers?.host ?? req.get?.('host') ?? '';
    const host = String(hostHeader);
    const isLocal =
      host.includes('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.startsWith('0.0.0.0');

    if (isLocal) {
      return false;
    }

    if ((req as any).secure === true) {
      return true;
    }

    const xfProto = String(req.headers?.['x-forwarded-proto'] ?? '').toLowerCase();
    return xfProto === 'https';
  }

  setCsrfCookie(
    req: ExpressRequest,
    res: ExpressResponse,
    token: string,
  ): void {
    const secureCookie = this.deriveSecureCookieFlag(req);
    const hostHeader = req.headers?.host ?? req.get?.('host') ?? '';
    const host = String(hostHeader);
    const isLocal =
      host.includes('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.startsWith('0.0.0.0');

    // Cookie is used by CsrfGuard for server-side cookie/header token matching.
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      secure: secureCookie,
      sameSite: isLocal ? 'lax' : 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
