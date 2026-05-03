import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantPersistenceGuardrailSubscriber } from './tenant-persistence-guardrail.subscriber';
import {
  setTenantRepositoryQueryGuardrailContextGetter,
  setTenantRepositoryQueryGuardrailDepthManager,
  installTenantRepositoryCreateQueryBuilderGuardrail,
} from './tenant-repository-query-guardrail';

/**
 * TenancyModule provides tenant context management using AsyncLocalStorage.
 * This module is global so TenantContextService can be injected anywhere.
 *
 * On init, installs the runtime tenant guardrail:
 * - Patches Repository.prototype.createQueryBuilder to detect tenant scoping bypasses
 * - Registers TypeORM subscriber to manage skip-depth during persistence operations
 */
@Global()
@Module({
  providers: [TenantContextService, TenantPersistenceGuardrailSubscriber],
  exports: [TenantContextService],
})
export class TenancyModule implements OnModuleInit {
  private readonly logger = new Logger(TenancyModule.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  onModuleInit(): void {
    // Wire the ALS context getter so the guardrail can read org + skip depth
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: this.tenantContextService.getOrganizationId(),
      skipDepth: this.tenantContextService.getSkipTenantGuardrailDepth(),
    }));

    // Wire the depth manager so Repository method wrappers can increment/decrement
    setTenantRepositoryQueryGuardrailDepthManager(
      () => this.tenantContextService.incrementSkipTenantGuardrailDepth(),
      () => this.tenantContextService.decrementSkipTenantGuardrailDepth(),
    );

    // Patch Repository.prototype (createQueryBuilder + read/write methods)
    installTenantRepositoryCreateQueryBuilderGuardrail();

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        'Runtime tenant guardrail installed (dev/test mode)',
      );
    }
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
