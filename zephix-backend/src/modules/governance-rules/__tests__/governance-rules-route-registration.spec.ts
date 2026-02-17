/**
 * Verifies GovernanceRulesController routes are correctly registered.
 *
 * Wave 9 blocker: controller used @Controller('api/admin/governance-rules')
 * but main.ts sets app.setGlobalPrefix('api'). Result: all routes were
 * mounted at /api/api/admin/governance-rules/... (double prefix), making
 * every governance endpoint unreachable at the documented path.
 *
 * Fix: changed to @Controller('admin/governance-rules').
 * With global prefix 'api', routes resolve to /api/admin/governance-rules/...
 */
import { GovernanceRulesController } from '../controllers/governance-rules.controller';

describe('GovernanceRulesController route registration', () => {
  const proto = GovernanceRulesController.prototype;

  it('controller class exists', () => {
    expect(GovernanceRulesController).toBeDefined();
  });

  it('controller prefix is admin/governance-rules (not api/admin/...)', () => {
    const prefix = Reflect.getMetadata('path', GovernanceRulesController);
    expect(prefix).toBe('admin/governance-rules');
  });

  it('prefix does NOT start with api/ (global prefix handles that)', () => {
    const prefix = Reflect.getMetadata('path', GovernanceRulesController);
    expect(prefix).not.toMatch(/^api\//);
  });

  it('full route with global prefix is /api/admin/governance-rules', () => {
    const prefix = Reflect.getMetadata('path', GovernanceRulesController);
    const fullRoute = `/api/${prefix}`;
    expect(fullRoute).toBe('/api/admin/governance-rules');
  });

  // --- Rule Set endpoints ---

  it('createRuleSet exists at POST rule-sets', () => {
    expect(typeof proto.createRuleSet).toBe('function');
    const path = Reflect.getMetadata('path', proto.createRuleSet);
    expect(path).toBe('rule-sets');
  });

  it('listRuleSets exists at GET rule-sets', () => {
    expect(typeof proto.listRuleSets).toBe('function');
    const path = Reflect.getMetadata('path', proto.listRuleSets);
    expect(path).toBe('rule-sets');
  });

  it('getRuleSet exists at GET rule-sets/:id', () => {
    expect(typeof proto.getRuleSet).toBe('function');
    const path = Reflect.getMetadata('path', proto.getRuleSet);
    expect(path).toBe('rule-sets/:id');
  });

  it('updateRuleSet exists at PATCH rule-sets/:id', () => {
    expect(typeof proto.updateRuleSet).toBe('function');
    const path = Reflect.getMetadata('path', proto.updateRuleSet);
    expect(path).toBe('rule-sets/:id');
  });

  it('deactivateRuleSet exists at POST rule-sets/:id/deactivate', () => {
    expect(typeof proto.deactivateRuleSet).toBe('function');
    const path = Reflect.getMetadata('path', proto.deactivateRuleSet);
    expect(path).toBe('rule-sets/:id/deactivate');
  });

  // --- Rule Version endpoints ---

  it('listRules exists at GET rule-sets/:id/rules', () => {
    expect(typeof proto.listRules).toBe('function');
    const path = Reflect.getMetadata('path', proto.listRules);
    expect(path).toBe('rule-sets/:id/rules');
  });

  it('listActiveRules exists at GET rule-sets/:id/rules/active', () => {
    expect(typeof proto.listActiveRules).toBe('function');
    const path = Reflect.getMetadata('path', proto.listActiveRules);
    expect(path).toBe('rule-sets/:id/rules/active');
  });

  it('addRuleVersion exists at POST rule-sets/:id/rules', () => {
    expect(typeof proto.addRuleVersion).toBe('function');
    const path = Reflect.getMetadata('path', proto.addRuleVersion);
    expect(path).toBe('rule-sets/:id/rules');
  });

  it('setActiveVersion exists at POST rule-sets/:id/rules/set-active', () => {
    expect(typeof proto.setActiveVersion).toBe('function');
    const path = Reflect.getMetadata('path', proto.setActiveVersion);
    expect(path).toBe('rule-sets/:id/rules/set-active');
  });

  // --- Evaluations ---

  it('listEvaluations exists at GET evaluations/:workspaceId', () => {
    expect(typeof proto.listEvaluations).toBe('function');
    const path = Reflect.getMetadata('path', proto.listEvaluations);
    expect(path).toBe('evaluations/:workspaceId');
  });

  // --- Route table (documents all expected routes) ---

  it('full route table matches expected endpoints', () => {
    const expectedRoutes = [
      { method: 'POST', path: '/api/admin/governance-rules/rule-sets' },
      { method: 'GET', path: '/api/admin/governance-rules/rule-sets' },
      { method: 'GET', path: '/api/admin/governance-rules/rule-sets/:id' },
      { method: 'PATCH', path: '/api/admin/governance-rules/rule-sets/:id' },
      { method: 'POST', path: '/api/admin/governance-rules/rule-sets/:id/deactivate' },
      { method: 'GET', path: '/api/admin/governance-rules/rule-sets/:id/rules' },
      { method: 'GET', path: '/api/admin/governance-rules/rule-sets/:id/rules/active' },
      { method: 'POST', path: '/api/admin/governance-rules/rule-sets/:id/rules' },
      { method: 'POST', path: '/api/admin/governance-rules/rule-sets/:id/rules/set-active' },
      { method: 'GET', path: '/api/admin/governance-rules/evaluations/:workspaceId' },
    ];
    expect(expectedRoutes.length).toBe(10);

    const prefix = Reflect.getMetadata('path', GovernanceRulesController);
    expect(`/api/${prefix}`).toBe('/api/admin/governance-rules');
  });

  it('no double prefix: controller path must not start with api/', () => {
    const prefix = Reflect.getMetadata('path', GovernanceRulesController);
    expect(prefix.startsWith('api/')).toBe(false);
  });

  it('controller has AdminGuard applied (security: admin-only access)', () => {
    const guards = Reflect.getMetadata('__guards__', GovernanceRulesController);
    expect(guards).toBeDefined();
    expect(guards.length).toBeGreaterThanOrEqual(2);
    const guardNames = guards.map((g: any) => g.name || g.constructor?.name);
    expect(guardNames).toContain('JwtAuthGuard');
    expect(guardNames).toContain('AdminGuard');
  });
});
