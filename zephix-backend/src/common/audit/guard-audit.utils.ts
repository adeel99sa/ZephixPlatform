import { createHash, randomUUID } from 'crypto';
import type { Request } from 'express';
import { HttpException } from '@nestjs/common';
import { extractValidUuid } from '../utils/uuid-validator.util';
import type { AuthRequest } from '../http/auth-request';
import type { GuardAuditEventInput } from '../../modules/audit/dto/guard-audit-event.input';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * entity_id for authorization_decision rows: correlationId when it is a UUID,
 * otherwise a deterministic UUID derived from the decision context.
 */
export function resolveGuardAuditEntityId(input: GuardAuditEventInput): string {
  if (input.correlationId && isUuidString(input.correlationId)) {
    return input.correlationId;
  }
  const seed = [
    input.organizationId,
    input.actorUserId,
    input.endpoint.method,
    input.endpoint.path,
    input.decision,
    input.correlationId ?? '',
    input.requiredRole,
  ].join('|');
  return deterministicUuidFromSeed(seed);
}

function deterministicUuidFromSeed(seed: string): string {
  const hash = createHash('sha256').update(seed, 'utf8').digest();
  const buf = Buffer.alloc(16);
  hash.copy(buf, 0, 0, 16);
  buf[6] = (buf[6] & 0x0f) | 0x50;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = buf.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Correlation id when request id is missing or non-UUID */
export function fallbackCorrelationId(): string {
  return randomUUID();
}

/** Pattern-style path for audit (Express route template when available). */
export function endpointPathForAudit(req: Request): string {
  const base = String((req as { baseUrl?: string }).baseUrl || '');
  const route = (req as { route?: { path?: string } }).route;
  const routePath = route?.path ? String(route.path) : '';
  if (routePath) {
    const joined = `${base}${routePath}`.replace(/\/{2,}/g, '/') || '/';
    return joined.startsWith('/') ? joined : `/${joined}`;
  }
  const p = req.path || '/';
  return p.startsWith('/') ? p : `/${p}`;
}

export function extractWorkspaceIdForAudit(req: AuthRequest): string | null {
  const fromHeader = extractValidUuid(req.headers?.['x-workspace-id']);
  if (fromHeader) return fromHeader;
  const fromParam = extractValidUuid(req.params?.workspaceId);
  if (fromParam) return fromParam;
  const fromQuery = extractValidUuid(req.query?.workspaceId);
  return fromQuery ?? null;
}

export function correlationIdFromRequest(req: Request): string | undefined {
  const raw = req.headers['x-request-id'];
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s && isUuidString(s)) return s;
  return undefined;
}

export function httpExceptionMessage(exception: HttpException): string | undefined {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message?: unknown }).message;
    if (Array.isArray(m)) return m.map(String).join('; ');
    if (m !== undefined && m !== null) return String(m);
  }
  return undefined;
}
