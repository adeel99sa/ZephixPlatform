import { TenantPersistenceGuardrailSubscriber } from './tenant-persistence-guardrail.subscriber';
import { TenantContextService } from './tenant-context.service';

describe('TenantPersistenceGuardrailSubscriber', () => {
  let subscriber: TenantPersistenceGuardrailSubscriber;
  let tenantContextService: TenantContextService;
  let mockDataSource: any;

  beforeEach(() => {
    tenantContextService = new TenantContextService();
    mockDataSource = { subscribers: [] };
    subscriber = new TenantPersistenceGuardrailSubscriber(
      mockDataSource,
      tenantContextService,
    );
  });

  it('should self-register with DataSource on construction', () => {
    expect(mockDataSource.subscribers).toContain(subscriber);
  });

  describe('depth management within ALS context', () => {
    it('should increment depth on beforeInsert', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: 'org-1' },
        async () => {
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
          subscriber.beforeInsert({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(1);
        },
      );
    });

    it('should decrement depth on afterInsert', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: 'org-1' },
        async () => {
          subscriber.beforeInsert({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(1);
          subscriber.afterInsert({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
        },
      );
    });

    it('should handle nested persistence (depth 2 → 0)', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: 'org-1' },
        async () => {
          // Outer save
          subscriber.beforeInsert({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(1);

          // Nested/cascade save
          subscriber.beforeUpdate({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(2);

          // Nested complete
          subscriber.afterUpdate({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(1);

          // Outer complete
          subscriber.afterInsert({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
        },
      );
    });

    it('should not go negative on extra decrement', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: 'org-1' },
        async () => {
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
          // Extra decrement without prior increment
          subscriber.afterInsert({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
        },
      );
    });

    it('should handle beforeUpdate / afterUpdate lifecycle', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: 'org-1' },
        async () => {
          subscriber.beforeUpdate({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(1);
          subscriber.afterUpdate({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
        },
      );
    });

    it('should handle beforeRemove / afterRemove lifecycle', async () => {
      await tenantContextService.runWithTenant(
        { organizationId: 'org-1' },
        async () => {
          subscriber.beforeRemove({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(1);
          subscriber.afterRemove({} as any);
          expect(tenantContextService.getSkipTenantGuardrailDepth()).toBe(0);
        },
      );
    });
  });

  describe('without ALS context', () => {
    it('should not throw when incrementing without ALS context', () => {
      // No runWithTenant — no ALS store
      expect(() => subscriber.beforeInsert({} as any)).not.toThrow();
    });

    it('should not throw when decrementing without ALS context', () => {
      expect(() => subscriber.afterInsert({} as any)).not.toThrow();
    });
  });
});
