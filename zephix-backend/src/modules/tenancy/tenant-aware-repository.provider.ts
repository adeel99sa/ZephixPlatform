import { Provider } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from './tenant-aware.repository';
import { TenantContextService } from './tenant-context.service';

/**
 * Create a provider for TenantAwareRepository for a given entity.
 * This replaces @InjectRepository in modules.
 *
 * Usage in module:
 * {
 *   provide: getTenantAwareRepositoryToken(Entity),
 *   useFactory: createTenantAwareRepositoryProvider(Entity),
 *   inject: [DataSource, TenantContextService],
 * }
 */
export function createTenantAwareRepositoryProvider<T>(
  entity: new () => T,
): Provider {
  return {
    provide: getTenantAwareRepositoryToken(entity),
    useFactory: (
      dataSource: DataSource,
      tenantContextService: TenantContextService,
    ) => {
      const repository = dataSource.getRepository(entity);
      return new TenantAwareRepository<T>(
        repository,
        tenantContextService,
        entity,
      );
    },
    inject: [DataSource, TenantContextService],
  };
}

