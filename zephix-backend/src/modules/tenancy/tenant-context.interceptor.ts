import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { TenantContextService } from './tenant-context.service';
import { DataSource } from 'typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContextOptional } from '../../common/http/get-auth-context-optional';
import { extractValidUuid } from '../../common/utils/uuid-validator.util';

/**
 * TenantContextInterceptor sets tenant context for each request using AsyncLocalStorage.
 *
 * Rules:
 * 1. organizationId comes ONLY from req.user.organizationId (JWT payload)
 * 2. workspaceId comes from (in order):
 *    - Header: x-workspace-id
 *    - Route param: workspaceId (only if route declares :workspaceId)
 *    - Query param: workspaceId (optional)
 *    Must be a valid UUID. Invalid values are ignored.
 * 3. Workspace validation only occurs if a valid UUID workspaceId is provided
 * 4. Public endpoints (/api/health, /api/version) bypass tenancy checks entirely
 * 5. Context is cleared on response finish to prevent bleed
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);
  private readonly tenancyBypassPaths = ['/api/health', '/api/version'];

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Extract workspaceId from request.
   * Only accepts workspaceId from:
   * 1. Header: x-workspace-id
   * 2. Route param: workspaceId (only if route declares :workspaceId and value is valid UUID)
   * 3. Query param: workspaceId (only if value is valid UUID)
   *
   * Invalid UUIDs are silently ignored (not treated as workspaceId).
   * Never extracts from path segments.
   */
  private extractWorkspaceId(req: any): string | undefined {
    // Priority 1: Header
    const fromHeader = extractValidUuid(req.headers?.['x-workspace-id']);
    if (fromHeader) return fromHeader;

    // Priority 2: Route param (only if valid UUID)
    const fromParam = extractValidUuid(req.params?.workspaceId);
    if (fromParam) return fromParam;

    // Priority 3: Query param (only if valid UUID)
    const fromQuery = extractValidUuid(req.query?.workspaceId);
    if (fromQuery) return fromQuery;

    // No valid workspaceId found
    return undefined;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    // Bypass tenancy checks for public endpoints
    if (this.tenancyBypassPaths.includes(request.path)) {
      return next.handle();
    }

    const ctx = getAuthContextOptional(request);

    // Rule 1: organizationId ONLY from req.user.organizationId
    const organizationId = ctx?.organizationId;

    if (!organizationId) {
      // Allow unauthenticated routes (health checks, public endpoints)
      // But log a warning if it looks like it should be authenticated
      if (
        request.path.startsWith('/api/') &&
        !this.tenancyBypassPaths.some(path => request.path.includes(path))
      ) {
        this.logger.warn(
          `Request to ${request.path} missing organizationId in user context`,
        );
      }
      // Continue without tenant context - some routes may not need it
      return next.handle();
    }

    // Rule 2: Extract workspaceId from header, route param, or query param
    // Only validate if we have a valid UUID workspaceId
    let workspaceId: string | undefined;
    const extractedWorkspaceId = this.extractWorkspaceId(request);

    if (extractedWorkspaceId) {
      // Validate workspace belongs to organization
      try {
        const workspaceRepo = this.dataSource.getRepository(Workspace);
        const workspace = await workspaceRepo.findOne({
          where: {
            id: extractedWorkspaceId,
            organizationId: organizationId,
          },
        });

        if (!workspace) {
          throw new ForbiddenException(
            `Workspace ${extractedWorkspaceId} does not belong to your organization`,
          );
        }

        workspaceId = extractedWorkspaceId;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        this.logger.error(
          `Error validating workspace ${extractedWorkspaceId}: ${error.message}`,
        );
        throw new ForbiddenException('Failed to validate workspace access');
      }
    }

    // Generate request ID for tracing
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set tenant context using AsyncLocalStorage.run
    // This ensures context is available throughout the async request lifecycle
    // We need to wrap the Observable creation in runWithTenant
    return new Observable((subscriber) => {
      this.tenantContextService
        .runWithTenant(
          {
            organizationId,
            workspaceId,
          },
          async () => {
            // Store requestId in context
            const store = this.tenantContextService.getStore();
            if (store) {
              store.set('requestId', requestId);
            }

            // Execute the handler within tenant context
            const handler = next.handle();
            handler
              .pipe(
                tap(() => {
                  // Success - context will be cleared when async context ends
                }),
                catchError((error) => {
                  // Error occurred - context will still be cleared
                  this.logger.error(
                    `Request error in tenant context: ${error.message}`,
                    error.stack,
                  );
                  throw error;
                }),
              )
              .subscribe({
                next: (value) => subscriber.next(value),
                error: (error) => subscriber.error(error),
                complete: () => subscriber.complete(),
              });
          },
        )
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }
}
