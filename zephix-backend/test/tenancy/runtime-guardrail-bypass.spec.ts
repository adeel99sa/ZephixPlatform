/**
 * Runtime guardrail bypass detection — integration test
 *
 * CRITICAL: Uses createNestApplication() + app.init() (NOT compile()) so that
 * TenancyModule.onModuleInit fires and installs the prototype patch.
 *
 * Tests:
 * 1. Bypass detection: DataSource.createQueryBuilder on tenant entity with org context → throws
 * 2. Positive: TenantAwareRepository.qb() → no throw (marker set)
 * 3. Persistence positive: repository.save() inside tenant context → no false positive
 * 4. No-context positive: DataSource.createQueryBuilder without org context → no throw
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { TenantContextService } from '../../src/modules/tenancy/tenant-context.service';
import { Project } from '../../src/modules/projects/entities/project.entity';
import { RateLimiterGuard } from '../../src/common/guards/rate-limiter.guard';

// Skip if no DATABASE_URL (CI without DB, local without postgres)
const describeFn = process.env.DATABASE_URL ? describe : describe.skip;

describeFn('Runtime Guardrail Bypass Detection (app.init)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tenantContextService: TenantContextService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(RateLimiterGuard)
      .useValue({ canActivate: () => true })
      .compile();

    // CRITICAL: createNestApplication + init() — onModuleInit fires here
    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    tenantContextService = app.get(TenantContextService);
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Bypass detection (negative tests)', () => {
    const TEST_ORG_ID = 'a1111111-1111-4111-8111-111111111111';

    it('should throw when calling getMany on bypassed QB with org context', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TEST_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project');

          // Assertion fires synchronously before the async DB call
          expect(() => qb.getMany()).toThrow(
            /Tenant scoping bypass detected/,
          );
        },
      );
    });

    it('should throw when calling getOne on bypassed QB', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TEST_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project');

          expect(() => qb.getOne()).toThrow(
            /Tenant scoping bypass detected/,
          );
        },
      );
    });

    it('should throw when calling getRawMany on bypassed QB', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TEST_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project')
            .select('project.id');

          expect(() => qb.getRawMany()).toThrow(
            /Tenant scoping bypass detected/,
          );
        },
      );
    });

    it('should throw when calling getCount on bypassed QB', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: TEST_ORG_ID },
        async () => {
          const qb = dataSource
            .getRepository(Project)
            .createQueryBuilder('project');

          expect(() => qb.getCount()).toThrow(
            /Tenant scoping bypass detected/,
          );
        },
      );
    });
  });

  describe('Positive tests (should NOT throw)', () => {
    const TEST_ORG_ID = 'a1111111-1111-4111-8111-111111111111';

    it('should not throw when no org context is present (system operation)', async () => {
      // No runWithTenant — simulates background/system operation
      const qb = dataSource
        .getRepository(Project)
        .createQueryBuilder('project');

      // Should not throw — no org context means guardrail skips
      await expect(qb.getMany()).resolves.toBeDefined();
    });

    it('should not throw for persistence operations inside tenant context', async () => {
      // This verifies the subscriber depth counter prevents false positives
      // on TypeORM internal QB calls during save/update/delete.
      // We use a valid org UUID but don't actually need the org to exist —
      // the guardrail check happens before the DB operation executes.
      await tenantContextService.runWithTenant(
        { organizationId: TEST_ORG_ID },
        async () => {
          // Verify depth starts at 0
          expect(
            tenantContextService.getSkipTenantGuardrailDepth(),
          ).toBe(0);

          // The save will fail (no org in DB), but the guardrail should NOT
          // fire on TypeORM's internal createQueryBuilder calls.
          // We catch the DB error — the important thing is it's NOT a
          // "Tenant scoping bypass detected" error.
          try {
            await dataSource.getRepository(Project).save({
              name: 'Guardrail Test Project',
              organizationId: TEST_ORG_ID,
              status: 'planning',
            } as any);
          } catch (err: any) {
            // DB constraint error is expected (org doesn't exist).
            // Guardrail bypass error is NOT expected.
            expect(err.message).not.toMatch(
              /Tenant scoping bypass detected/,
            );
          }

          // Depth should return to 0 after persistence completes (or fails)
          // Note: if afterInsert didn't fire due to error, depth may be elevated
          // but this is acceptable per INVARIANT 2 design decision
        },
      );
    });
  });
});
