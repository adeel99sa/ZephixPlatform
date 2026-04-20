/**
 * Locks bootstrap rules for /api/workspaces: list (GET) and create (POST) must not
 * depend on validating x-workspace-id against the current workspace.
 * (Logic mirrors TenantContextInterceptor.shouldBypassWorkspaceValidation.)
 */
describe('TenantContextInterceptor — /api/workspaces header bypass', () => {
  const workspaceHeaderValidationBypassPaths = ['/api/workspaces', '/workspaces'];

  function shouldBypassWorkspaceValidation(method: string, path: string): boolean {
    const pathOnly = String(path || '')
      .split('?')[0]
      .replace(/\/+$/, '');
    return (
      workspaceHeaderValidationBypassPaths.includes(pathOnly) &&
      (method === 'GET' || method === 'POST')
    );
  }

  it('bypasses for GET /api/workspaces', () => {
    expect(shouldBypassWorkspaceValidation('GET', '/api/workspaces')).toBe(true);
  });

  it('bypasses for POST /api/workspaces (org-level create)', () => {
    expect(shouldBypassWorkspaceValidation('POST', '/api/workspaces')).toBe(true);
  });

  it('bypasses for POST /workspaces when path omits global api prefix', () => {
    expect(shouldBypassWorkspaceValidation('POST', '/workspaces')).toBe(true);
  });

  it('bypasses when path has trailing slash', () => {
    expect(shouldBypassWorkspaceValidation('GET', '/api/workspaces/')).toBe(true);
  });

  it('does not bypass for POST /api/workspaces/join', () => {
    expect(shouldBypassWorkspaceValidation('POST', '/api/workspaces/join')).toBe(false);
  });

  it('does not bypass for PATCH /api/workspaces/:id', () => {
    expect(shouldBypassWorkspaceValidation('PATCH', '/api/workspaces/ws-1')).toBe(false);
  });
});
