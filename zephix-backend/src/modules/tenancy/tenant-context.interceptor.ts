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

/**
 * TenantContextInterceptor sets tenant context for each request using AsyncLocalStorage.
 *
 * Rules:
 * 1. organizationId comes ONLY from req.user.organizationId (JWT payload)
 * 2. workspaceId comes from route params (:workspaceId) or x-workspace-id header, then validated against org
 * 3. Context is cleared on response finish to prevent bleed
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const ctx = getAuthContextOptional(request);

    // Rule 1: organizationId ONLY from req.user.organizationId
    const organizationId = ctx?.organizationId;

    if (!organizationId) {
      // Allow unauthenticated routes (health checks, public endpoints)
      // But log a warning if it looks like it should be authenticated
      if (
        request.path.startsWith('/api/') &&
        !request.path.includes('/health')
      ) {
        this.logger.warn(
          `Request to ${request.path} missing organizationId in user context`,
        );
      }
      // Continue without tenant context - some routes may not need it
      return next.handle();
    }

    // Rule 2: workspaceId from route params, then headers, then validate
    let workspaceId: string | undefined;
    const routeWorkspaceId = request.params?.workspaceId || request.params?.id;
    const headerWorkspaceId = request.headers['x-workspace-id'] as string;
    const workspaceIdToValidate = routeWorkspaceId || headerWorkspaceId;

    if (workspaceIdToValidate) {
      // Validate workspace belongs to organization
      try {
        const workspaceRepo = this.dataSource.getRepository(Workspace);
        const workspace = await workspaceRepo.findOne({
          where: {
            id: workspaceIdToValidate,
            organizationId: organizationId,
          },
        });

        if (!workspace) {
          throw new ForbiddenException(
            `Workspace ${workspaceIdToValidate} does not belong to your organization`,
          );
        }

        workspaceId = workspaceIdToValidate;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        this.logger.error(
          `Error validating workspace ${workspaceIdToValidate}: ${error.message}`,
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
