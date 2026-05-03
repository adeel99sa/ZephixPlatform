/**
 * Negative test for runtime guardrail bypass detection
 *
 * This test intentionally uses DataSource.createQueryBuilder directly
 * and proves that the runtime guardrail throws in dev/test mode.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { TenantContextService } from '../../src/modules/tenancy/tenant-context.service';
import {
  getTenantAwareRepositoryToken,
  TenantAwareRepository,
} from '../../src/modules/tenancy/tenant-aware.repository';
import { Project } from '../../src/modules/projects/entities/project.entity';

/** Valid UUID for Postgres uuid columns when qb() applies organizationId filter */
const TENANT_ORG_ID = '00000000-0000-4000-8000-000000000001';

describe('Runtime Guardrail Bypass Detection', () => {
  let moduleFixture: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let tenantContextService: TenantContextService;
  let tenantProjectRepo: TenantAwareRepository<Project>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // compile() alone does not run onModuleInit — TenancyModule must init to install the guardrail
    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    tenantContextService = moduleFixture.get(TenantContextService);
    tenantProjectRepo = moduleFixture.get(getTenantAwareRepositoryToken(Project));
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  describe('Direct DataSource.createQueryBuilder bypass attempt', () => {
    it('should throw when executing query builder created via DataSource.createQueryBuilder', async () => {
      // Set tenant context
      await tenantContextService.runWithTenant(
        { organizationId: TENANT_ORG_ID },
        async () => {
          // Intentionally bypass TenantAwareRepository by using DataSource.createQueryBuilder directly
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project');

          // Try to execute - should throw because query builder is not tenant-aware
          await expect(qb.getMany()).rejects.toThrow(
            /Tenant scoping bypass detected.*Repository\.createQueryBuilder/,
          );
        },
      );
    });

    it('should throw when calling getOne on bypassed query builder', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TENANT_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project');

          await expect(qb.getOne()).rejects.toThrow(
            /Tenant scoping bypass detected.*Repository\.createQueryBuilder/,
          );
        },
      );
    });

    it('should throw when calling execute on bypassed query builder', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TENANT_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project');

          await expect(qb.execute()).rejects.toThrow(
            /Tenant scoping bypass detected.*Repository\.createQueryBuilder/,
          );
        },
      );
    });

    it('should throw when calling getRawMany on bypassed query builder', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TENANT_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project')
            .select('project.id');

          await expect(qb.getRawMany()).rejects.toThrow(
            /Tenant scoping bypass detected.*Repository\.createQueryBuilder/,
          );
        },
      );
    });
  });

  describe('TenantAwareRepository query builder (correct usage)', () => {
    it('should NOT throw when using TenantAwareRepository.qb()', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TENANT_ORG_ID },
        async () => {
          const rows = await tenantProjectRepo.qb().getMany();
          expect(Array.isArray(rows)).toBe(true);
          for (const row of rows) {
            expect(row.organizationId).toBe(TENANT_ORG_ID);
          }
        },
      );
    });
  });
});



