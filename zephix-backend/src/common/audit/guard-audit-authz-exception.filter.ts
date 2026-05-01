import {
  ArgumentsHost,
  Catch,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { AuditService } from '../../modules/audit/services/audit.service';
import { AuthRequest } from '../http/auth-request';
import { getAuthContextOptional } from '../http/get-auth-context-optional';
import { resolvePlatformRoleFromRequestUser } from '../auth/platform-roles';
import { shouldEmitGuardAuditAction } from './guard-audit.constants';
import { GuardAuditRouteRegistry } from './guard-audit-route-registry.service';
import {
  correlationIdFromRequest,
  endpointPathForAudit,
  extractWorkspaceIdForAudit,
  httpExceptionMessage,
} from './guard-audit.utils';

/**
 * Emits DENY guard audits for 401/403 (guard-thrown or handler-thrown).
 * Uses {@link GuardAuditRouteRegistry} because {@link ArgumentsHost} here has no handler ref
 * (see Nest RouterProxy). {@link GuardAuditInterceptor} only emits ALLOW to avoid double DENY.
 */
@Catch(ForbiddenException, UnauthorizedException)
export class GuardAuditAuthzExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly auditService: AuditService,
    private readonly registry: GuardAuditRouteRegistry,
    adapterHost: HttpAdapterHost,
  ) {
    super(adapterHost.httpAdapter);
  }

  async catch(
    exception: ForbiddenException | UnauthorizedException,
    host: ArgumentsHost,
  ): Promise<void> {
    await this.emitDenyFromRoute(host, exception);
    super.catch(exception, host);
  }

  private async emitDenyFromRoute(
    host: ArgumentsHost,
    exception: ForbiddenException | UnauthorizedException,
  ): Promise<void> {
    const req = host.switchToHttp().getRequest<AuthRequest>();
    const pathname =
      (req.originalUrl || req.url || req.path || '/').split('?')[0] || '/';
    const meta = this.registry.resolve(req.method, pathname);
    if (!meta || !shouldEmitGuardAuditAction(meta.action)) return;

    const requiredRole = meta.requiredRole?.trim();
    if (!requiredRole) return;

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
      decision: 'DENY',
      denyReason: httpExceptionMessage(exception),
      requiredRole,
      correlationId: correlationIdFromRequest(req),
    });
  }
}
