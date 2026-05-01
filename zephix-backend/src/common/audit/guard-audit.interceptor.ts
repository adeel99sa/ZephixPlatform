import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { Response } from 'express';
import { AuditService } from '../../modules/audit/services/audit.service';
import { getAuthContextOptional } from '../http/get-auth-context-optional';
import type { AuthRequest } from '../http/auth-request';
import { resolvePlatformRoleFromRequestUser } from '../auth/platform-roles';
import {
  AUDIT_GUARD_DECISION_METADATA_KEY,
  AuditGuardDecisionMetadata,
  shouldEmitGuardAuditAction,
} from './guard-audit.constants';
import {
  correlationIdFromRequest,
  endpointPathForAudit,
  extractWorkspaceIdForAudit,
} from './guard-audit.utils';

/**
 * Emits ALLOW guard audits after successful handler completion (config/destructive only).
 * DENY for 401/403 is handled by {@link GuardAuditAuthzExceptionFilter} so each denied request
 * is audited exactly once (guards run before interceptors).
 */
@Injectable()
export class GuardAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap((body) =>
        from(this.emitAllowIfNeeded(context).then(() => body)),
      ),
    );
  }

  private async emitAllowIfNeeded(context: ExecutionContext): Promise<void> {
    const http = context.switchToHttp();
    const res = http.getResponse<Response>();
    const status = Number(res.statusCode);
    if (!Number.isFinite(status) || status < 200 || status >= 300) return;

    const handler = context.getHandler();
    const meta = this.reflector.get<AuditGuardDecisionMetadata | undefined>(
      AUDIT_GUARD_DECISION_METADATA_KEY,
      handler,
    );
    if (!meta || !shouldEmitGuardAuditAction(meta.action)) return;

    const requiredRole = meta.requiredRole?.trim();
    if (!requiredRole) return;

    const req = http.getRequest<AuthRequest>();
    const auth = getAuthContextOptional(req);
    if (!auth.organizationId || !auth.userId) return;

    await this.auditService.recordGuardEvent({
      organizationId: auth.organizationId,
      workspaceId: extractWorkspaceIdForAudit(req),
      actorUserId: auth.userId,
      actorPlatformRole: resolvePlatformRoleFromRequestUser(req.user),
      actorWorkspaceRole: null,
      endpoint: {
        method: req.method,
        path: endpointPathForAudit(req),
      },
      decision: 'ALLOW',
      requiredRole,
      correlationId: correlationIdFromRequest(req),
    });
  }
}
