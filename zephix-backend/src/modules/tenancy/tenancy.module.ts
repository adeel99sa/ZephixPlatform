import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import {
  installTenantRepositoryCreateQueryBuilderGuardrail,
  setTenantRepositoryQueryGuardrailContextGetter,
} from './tenant-repository-query-guardrail';

/**
 * TenancyModule provides tenant context management using AsyncLocalStorage.
 * This module is global so TenantContextService can be injected anywhere.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenancyModule implements OnModuleInit {
  constructor(private readonly tenantContextService: TenantContextService) {}

  onModuleInit(): void {
    setTenantRepositoryQueryGuardrailContextGetter(() =>
      this.tenantContextService.getOrganizationId(),
    );
    installTenantRepositoryCreateQueryBuilderGuardrail();
  }
}

// Re-export for convenience
export { createTenantAwareRepositoryProvider } from './tenant-aware-repository.provider';
export {
  getTenantAwareRepositoryToken,
  TenantAwareRepository,
} from './tenant-aware.repository';
export {
  WorkspaceScoped,
  isWorkspaceScoped,
} from './workspace-scoped.decorator';
export { TenantJobPayload } from './types/tenant-job.types';
export { runJobWithTenant } from './helpers/job-tenant.helper';
