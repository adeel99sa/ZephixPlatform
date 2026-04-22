/**
 * Org admin API must not validate x-workspace-id from the header (see TenantContextInterceptor).
 * Mirrors path prefix rule so refactors stay aligned.
 */
describe('TenantContextInterceptor — /api/admin workspace header', () => {
  /** Keep in sync with TenantContextInterceptor.isOrgAdminPlanePath */
  function isOrgAdminPlanePath(path: string): boolean {
    const p = String(path || '');
    return (
      p.startsWith('/api/admin') ||
      p === '/admin' ||
      p.startsWith('/admin/')
    );
  }

  it('treats template governance as admin plane', () => {
    expect(
      isOrgAdminPlanePath('/api/admin/templates/uuid/governance'),
    ).toBe(true);
  });

  it('treats admin plane when /api prefix is stripped at ingress', () => {
    expect(isOrgAdminPlanePath('/admin/templates/uuid/governance')).toBe(true);
  });

  it('does not treat work routes as admin plane', () => {
    expect(isOrgAdminPlanePath('/api/work/workspaces/ws/tasks')).toBe(false);
  });
});
