import 'reflect-metadata';
import { ForbiddenException, ExecutionContext, CallHandler } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../tenant-context.service';
import { TenantContextInterceptor } from '../tenant-context.interceptor';

/**
 * Engine 2 Decision C contract: missing tenant context returns HTTP 403
 * (ForbiddenException), never 401, never 404, never 500.
 *
 * This contract is enforced at two layers (defense in depth):
 *   - TenantContextInterceptor (centralized chokepoint for /api/ requests)
 *   - TenantContextService.assertOrganizationId (service-layer fallback)
 *
 * WS-TENANCY-EXEC fix dispatch Commits 2 (R3b interceptor) + 4 (R5-B service)
 * close the contract gap that previously surfaced as plain Error → 500 at the
 * service layer and warning-and-continue (no enforcement) at the interceptor
 * layer.
 */

describe('Engine 2 Decision C contract — tenant context enforcement', () => {
  describe('Service layer (R5-B): TenantContextService.assertOrganizationId', () => {
    let service: TenantContextService;

    beforeEach(() => {
      service = new TenantContextService();
    });

    it('throws ForbiddenException when organizationId is absent', () => {
      expect(() => service.assertOrganizationId()).toThrow(ForbiddenException);
    });

    it('throws specifically ForbiddenException, NOT a plain Error (regression guard)', () => {
      try {
        service.assertOrganizationId();
        throw new Error('Expected ForbiddenException to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        // Sanity: confirm the exception serializes to HTTP 403 via the default filter.
        expect((err as ForbiddenException).getStatus()).toBe(403);
        // Regression guard: not a plain Error masquerading.
        expect(err.constructor.name).toBe('ForbiddenException');
      }
    });

    it('returns the org id when context is set via runWithTenant', async () => {
      await service.runWithTenant(
        { organizationId: 'org-A-uuid' },
        async () => {
          expect(service.assertOrganizationId()).toBe('org-A-uuid');
        },
      );
    });

    it('preserves a diagnostic message that names organizationId', () => {
      try {
        service.assertOrganizationId();
        throw new Error('Expected ForbiddenException to be thrown');
      } catch (err) {
        expect((err as ForbiddenException).message).toContain('organizationId');
      }
    });
  });

  describe('Interceptor layer (R3b): TenantContextInterceptor.intercept', () => {
    let interceptor: TenantContextInterceptor;

    beforeEach(() => {
      const tenantContext = new TenantContextService();
      const mockDataSource = { getRepository: jest.fn() } as any;
      interceptor = new TenantContextInterceptor(
        tenantContext,
        mockDataSource as DataSource,
      );
    });

    function buildContext(path: string, user: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            path,
            headers: {},
            method: 'GET',
            user,
            params: {},
            query: {},
          }),
        }),
      } as any;
    }

    const passthroughHandler: CallHandler = {
      handle: () => of('handled'),
    };

    it('throws ForbiddenException when /api/ request lacks user.organizationId', async () => {
      const ctx = buildContext('/api/work-phases', {
        id: 'user-1' /* organizationId intentionally absent */,
      });
      await expect(
        interceptor.intercept(ctx, passthroughHandler),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException with status 403 (Decision C contract — not 401, 404, or 500)', async () => {
      const ctx = buildContext('/api/my-work', {
        id: 'user-1',
        email: 'x@y',
      });
      try {
        await interceptor.intercept(ctx, passthroughHandler);
        throw new Error('Expected ForbiddenException');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).getStatus()).toBe(403);
      }
    });

    it('throws ForbiddenException when user object is missing entirely on /api/ path', async () => {
      const ctx = buildContext('/api/work-phases', null);
      await expect(
        interceptor.intercept(ctx, passthroughHandler),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('passes through for tenancy bypass path /api/health (no org context required)', async () => {
      const ctx = buildContext('/api/health', null);
      const observable = await interceptor.intercept(ctx, passthroughHandler);
      const result = await firstValueFrom(observable);
      expect(result).toBe('handled');
    });

    it('passes through for tenancy bypass path /api/version (no org context required)', async () => {
      const ctx = buildContext('/api/version', null);
      const observable = await interceptor.intercept(ctx, passthroughHandler);
      const result = await firstValueFrom(observable);
      expect(result).toBe('handled');
    });

    it('passes through for non-/api/ paths even when org is missing (rare static asset / root probe)', async () => {
      const ctx = buildContext('/some-static-path', null);
      const observable = await interceptor.intercept(ctx, passthroughHandler);
      const result = await firstValueFrom(observable);
      expect(result).toBe('handled');
    });

    it('proceeds normally when organizationId is present on /api/ path', async () => {
      const ctx = buildContext('/api/my-work', {
        id: 'user-1',
        organizationId: 'org-A-uuid',
      });
      const observable = await interceptor.intercept(ctx, passthroughHandler);
      const result = await firstValueFrom(observable);
      expect(result).toBe('handled');
    });
  });
});
