/**
 * Org admin API must not validate x-workspace-id from the header (see TenantContextInterceptor).
 * Mirrors path prefix rule so refactors stay aligned.
 */
describe('TenantContextInterceptor — /api/admin workspace header', () => {
  function isOrgAdminApiPath(path: string): boolean {
    return String(path || '').startsWith('/api/admin');
  }

  it('treats template governance as admin plane', () => {
    expect(
      isOrgAdminApiPath('/api/admin/templates/uuid/governance'),
    ).toBe(true);
  });

  it('does not treat work routes as admin plane', () => {
    expect(isOrgAdminApiPath('/api/work/workspaces/ws/tasks')).toBe(false);
  });
});
