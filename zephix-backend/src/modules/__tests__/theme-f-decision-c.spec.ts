import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ExternalUserMappingsController } from '../integrations/external-user-mappings.controller';
import { IntegrationsController } from '../integrations/integrations.controller';
import { TemplateKpisController } from '../kpis/controllers/template-kpis.controller';
import { ProjectKpisController } from '../kpis/controllers/project-kpis.controller';
import { KpiDefinitionsController } from '../kpis/controllers/kpi-definitions.controller';
import { KpiComputeStatusController } from '../kpi-queue/controllers/kpi-compute-status.controller';

/**
 * WS-AF-BE-F-CONTROLLERS regression guards for Theme F audit findings.
 *
 * Audit (CODEBASE_AUDIT_2026-05-06.md, Theme F lines 73-75) flagged plain
 * `throw new Error(...)` in HTTP-adjacent paths surfacing as 500 instead of
 * stable HTTP exceptions. This spec locks the post-fix contract:
 *
 *   - Integrations (6 sites): ForbiddenException + status 403 (Decision C —
 *     missing tenant context returns 403, mirrors PR #260 R5-B at
 *     tenant-context.service.ts:55)
 *   - KPI (4 sites): UnauthorizedException + status 401 (defensive checks
 *     downstream of @UseGuards(JwtAuthGuard); preserves the auth contract
 *     if the unreachable branch ever fires)
 *
 * Unit-level: instantiate controllers with empty service mocks. The
 * defensive throw fires BEFORE any service call, so deeper mocking is
 * unnecessary.
 */

describe('Theme F — Decision C contract on integrations + KPI controllers', () => {
  describe('Integrations (6 sites): ForbiddenException + status 403 for missing org context', () => {
    let externalUserMappings: ExternalUserMappingsController;
    let integrations: IntegrationsController;

    // Authenticated user but no organizationId on the JWT payload — exercises
    // the post-JwtAuthGuard handler-layer Decision C check.
    const userNoOrg = { id: 'user-1' /* organizationId intentionally omitted */ } as any;

    beforeEach(() => {
      externalUserMappings = new ExternalUserMappingsController({} as any);
      integrations = new IntegrationsController(
        {} as any,
        {} as any,
        {} as any,
      );
    });

    async function expectForbidden403(promise: Promise<unknown>) {
      let caught: unknown;
      try {
        await promise;
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ForbiddenException);
      expect((caught as ForbiddenException).getStatus()).toBe(403);
    }

    it('Site 1 — external-user-mappings.createMapping', async () => {
      await expectForbidden403(
        externalUserMappings.createMapping({} as any, userNoOrg),
      );
    });

    it('Site 2 — external-user-mappings.listMappings', async () => {
      await expectForbidden403(
        externalUserMappings.listMappings(userNoOrg),
      );
    });

    it('Site 3 — integrations.createConnection', async () => {
      await expectForbidden403(
        integrations.createConnection({} as any, userNoOrg),
      );
    });

    it('Site 4 — integrations.listConnections', async () => {
      await expectForbidden403(integrations.listConnections(userNoOrg));
    });

    it('Site 5 — integrations.testConnection', async () => {
      await expectForbidden403(
        integrations.testConnection('connection-id', {} as any, userNoOrg),
      );
    });

    it('Site 6 — integrations.syncNow', async () => {
      await expectForbidden403(
        integrations.syncNow('connection-id', {} as any, userNoOrg),
      );
    });
  });

  describe('KPI (4 sites): UnauthorizedException + status 401 for defensive auth checks', () => {
    // Request without req.user — exercises the defensive branch that
    // JwtAuthGuard normally prevents from reaching, but still must honor
    // the auth contract (401) if it ever fires.
    const reqNoUser = { /* user intentionally omitted */ } as any;

    async function expectUnauthorized401(
      fn: () => Promise<unknown> | unknown,
    ) {
      let caught: unknown;
      try {
        await fn();
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UnauthorizedException);
      expect((caught as UnauthorizedException).getStatus()).toBe(401);
    }

    it('Site 7 — template-kpis (getAuthContext helper via list handler)', async () => {
      const ctrl = new TemplateKpisController({} as any);
      await expectUnauthorized401(() => ctrl.list('template-id', reqNoUser));
    });

    it('Site 8 — project-kpis (getAuthContext helper via getDefinitions handler)', async () => {
      const ctrl = new ProjectKpisController(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
      await expectUnauthorized401(() =>
        ctrl.getDefinitions('workspace-id', reqNoUser),
      );
    });

    it('Site 9 — kpi-definitions (getAuthContext helper via listDefinitions handler)', async () => {
      const ctrl = new KpiDefinitionsController({} as any);
      await expectUnauthorized401(() => ctrl.listDefinitions(reqNoUser));
    });

    it('Site 10 — kpi-compute-status (inline defensive check via getStatus handler)', async () => {
      const ctrl = new KpiComputeStatusController(
        {} as any,
        {} as any,
        {} as any,
      );
      await expectUnauthorized401(() =>
        ctrl.getStatus('workspace-id', 'project-id', {} as any, reqNoUser),
      );
    });
  });

  describe('Regression guards — exceptions are NOT plain Error', () => {
    it('integrations throw is specifically ForbiddenException, not plain Error', async () => {
      const ctrl = new IntegrationsController(
        {} as any,
        {} as any,
        {} as any,
      );
      const userNoOrg = { id: 'user-1' } as any;
      let caught: any;
      try {
        await ctrl.createConnection({} as any, userNoOrg);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ForbiddenException);
      expect(caught.constructor.name).toBe('ForbiddenException');
    });

    it('KPI throw is specifically UnauthorizedException, not plain Error', async () => {
      const ctrl = new KpiDefinitionsController({} as any);
      let caught: any;
      try {
        await ctrl.listDefinitions({} as any);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UnauthorizedException);
      expect(caught.constructor.name).toBe('UnauthorizedException');
    });
  });
});
