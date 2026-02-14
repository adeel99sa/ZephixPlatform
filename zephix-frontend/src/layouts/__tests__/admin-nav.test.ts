/**
 * Phase 4B: Admin navigation visibility tests.
 *
 * Tests buildAdminNavItems to verify:
 * - Org Command Center link appears only for platform ADMINs
 * - Uses isPlatformAdmin helper (no string literal checks)
 * - Other nav items are always present
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the access helper to control admin check
const mockIsPlatformAdmin = vi.fn();
vi.mock('@/utils/access', () => ({
  isPlatformAdmin: (user: any) => mockIsPlatformAdmin(user),
}));

// Mock useAuth — not used by buildAdminNavItems directly but needed by module
vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Import after mocks
import { buildAdminNavItems } from '../AdminLayout';

describe('buildAdminNavItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes Org Command Center for platform ADMIN', () => {
    const adminUser = { id: 'u1', platformRole: 'ADMIN' };
    mockIsPlatformAdmin.mockReturnValue(true);

    const items = buildAdminNavItems(adminUser);
    const orgItem = items.find((i: any) => i.id === 'org-command-center');

    expect(orgItem).toBeDefined();
    expect(orgItem!.path).toBe('/org-dashboard');
    expect(orgItem!.label).toBe('Org Command Center');
    expect(mockIsPlatformAdmin).toHaveBeenCalledWith(adminUser);
  });

  it('places Org Command Center right after Dashboard', () => {
    mockIsPlatformAdmin.mockReturnValue(true);

    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    expect(items[0].id).toBe('dashboard');
    expect(items[1].id).toBe('org-command-center');
  });

  it('excludes Org Command Center for MEMBER', () => {
    mockIsPlatformAdmin.mockReturnValue(false);

    const items = buildAdminNavItems({ platformRole: 'MEMBER' });
    const orgItem = items.find((i: any) => i.id === 'org-command-center');

    expect(orgItem).toBeUndefined();
  });

  it('excludes Org Command Center for VIEWER', () => {
    mockIsPlatformAdmin.mockReturnValue(false);

    const items = buildAdminNavItems({ platformRole: 'VIEWER' });
    const orgItem = items.find((i: any) => i.id === 'org-command-center');

    expect(orgItem).toBeUndefined();
  });

  it('excludes Org Command Center for null user', () => {
    mockIsPlatformAdmin.mockReturnValue(false);

    const items = buildAdminNavItems(null);
    const orgItem = items.find((i: any) => i.id === 'org-command-center');

    expect(orgItem).toBeUndefined();
  });

  it('always includes Dashboard, Organization, Governance, Workspaces groups', () => {
    mockIsPlatformAdmin.mockReturnValue(false);

    const items = buildAdminNavItems({ platformRole: 'MEMBER' });
    const ids = items.map((i: any) => i.id);

    expect(ids).toContain('dashboard');
    expect(ids).toContain('organization');
    expect(ids).toContain('governance');
    expect(ids).toContain('workspaces');
  });

  it('delegates admin check to isPlatformAdmin (no string matching)', () => {
    const user = { platformRole: 'admin', role: 'admin' };
    mockIsPlatformAdmin.mockReturnValue(true);

    buildAdminNavItems(user);

    expect(mockIsPlatformAdmin).toHaveBeenCalledWith(user);
    expect(mockIsPlatformAdmin).toHaveBeenCalledTimes(1);
  });
});

// ─── 4D-1: Ordering, grouping, and duplicate prevention ──────

describe('admin nav ordering and structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('base nav (non-admin) has exact ordering: dashboard, organization, governance, workspaces', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const items = buildAdminNavItems(null);
    const ids = items.map((i: any) => i.id);
    expect(ids).toEqual(['dashboard', 'organization', 'governance', 'workspaces']);
  });

  it('admin nav has exact ordering: dashboard, org-command-center, organization, governance, workspaces', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    const ids = items.map((i: any) => i.id);
    expect(ids).toEqual([
      'dashboard',
      'org-command-center',
      'organization',
      'governance',
      'workspaces',
    ]);
  });

  it('has no duplicate IDs', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    const ids = items.map((i: any) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate top-level labels', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    const labels = items.map((i: any) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('has no duplicate paths across all items and children', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    const allPaths: string[] = [];
    for (const item of items) {
      if ((item as any).path) allPaths.push((item as any).path);
      if ((item as any).children) {
        for (const child of (item as any).children) {
          allPaths.push(child.path);
        }
      }
    }
    expect(new Set(allPaths).size).toBe(allPaths.length);
  });

  it('Organization group has expected children', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const items = buildAdminNavItems(null);
    const org = items.find((i: any) => i.id === 'organization') as any;
    expect(org.children).toBeDefined();
    const childLabels = org.children.map((c: any) => c.label);
    expect(childLabels).toEqual(['Users', 'Teams', 'Usage & Limits', 'Billing & Plans']);
  });

  it('Governance group has expected children', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const items = buildAdminNavItems(null);
    const gov = items.find((i: any) => i.id === 'governance') as any;
    expect(gov.children).toBeDefined();
    const childLabels = gov.children.map((c: any) => c.label);
    expect(childLabels).toEqual(['Templates', 'Template Builder', 'Custom Fields']);
  });

  it('Workspaces & Projects group has expected children', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const items = buildAdminNavItems(null);
    const ws = items.find((i: any) => i.id === 'workspaces') as any;
    expect(ws.children).toBeDefined();
    const childLabels = ws.children.map((c: any) => c.label);
    expect(childLabels).toEqual(['All Workspaces', 'All Projects', 'Trash']);
  });

  it('every top-level item has an icon', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    for (const item of items) {
      expect((item as any).icon).toBeDefined();
      expect((item as any).icon).toBeTruthy();
    }
  });

  it('Org Command Center is a direct link (has path, no children)', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    const occ = items.find((i: any) => i.id === 'org-command-center') as any;
    expect(occ.path).toBe('/org-dashboard');
    expect(occ.children).toBeUndefined();
  });
});

// ─── 4D-4: Canonical admin nav completeness ─────────────────

describe('canonical admin nav single-source audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * This test prevents nav drift by asserting that buildAdminNavItems (the single
   * canonical source) covers ALL expected admin paths. If a dead-code config is
   * accidentally activated, this test will catch missing or extra paths.
   */
  it('covers all expected admin paths for ADMIN user', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const items = buildAdminNavItems({ platformRole: 'ADMIN' });
    const allPaths = collectAllPaths(items);

    const expectedPaths = [
      '/admin',
      '/org-dashboard',
      '/admin/users',
      '/admin/teams',
      '/admin/usage',
      '/admin/billing',
      '/admin/templates',
      '/admin/templates/builder',
      '/admin/templates/custom-fields',
      '/admin/workspaces',
      '/admin/projects',
      '/admin/trash',
    ];

    expect(allPaths.sort()).toEqual(expectedPaths.sort());
  });

  it('covers all expected admin paths for non-ADMIN user (no /org-dashboard)', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const items = buildAdminNavItems(null);
    const allPaths = collectAllPaths(items);

    const expectedPaths = [
      '/admin',
      '/admin/users',
      '/admin/teams',
      '/admin/usage',
      '/admin/billing',
      '/admin/templates',
      '/admin/templates/builder',
      '/admin/templates/custom-fields',
      '/admin/workspaces',
      '/admin/projects',
      '/admin/trash',
    ];

    expect(allPaths.sort()).toEqual(expectedPaths.sort());
  });

  it('non-ADMIN nav is strict subset of ADMIN nav', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const adminPaths = new Set(collectAllPaths(buildAdminNavItems({ platformRole: 'ADMIN' })));

    mockIsPlatformAdmin.mockReturnValue(false);
    const memberPaths = collectAllPaths(buildAdminNavItems({ platformRole: 'MEMBER' }));

    for (const p of memberPaths) {
      expect(adminPaths.has(p)).toBe(true);
    }
  });

  it('admin-only paths are exclusively /org-dashboard', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const adminPaths = collectAllPaths(buildAdminNavItems({ platformRole: 'ADMIN' }));

    mockIsPlatformAdmin.mockReturnValue(false);
    const memberPaths = new Set(collectAllPaths(buildAdminNavItems(null)));

    const adminOnly = adminPaths.filter((p) => !memberPaths.has(p));
    expect(adminOnly).toEqual(['/org-dashboard']);
  });
});

/** Recursively collect all paths from nav items */
function collectAllPaths(items: any[]): string[] {
  const paths: string[] = [];
  for (const item of items) {
    if (item.path) paths.push(item.path);
    if (item.children) {
      for (const child of item.children) {
        if (child.path) paths.push(child.path);
      }
    }
  }
  return paths;
}

// ─── 4E-3: Admin route registry — single source of truth ─────

/**
 * All admin routes registered in App.tsx router.
 * This list is the source of truth. If a new admin route is added to
 * the router, it must be added here. Tests verify the nav builder
 * covers every navigable route.
 */
const ADMIN_ROUTES_IN_ROUTER = [
  '/admin',
  '/admin/home',        // alias for dashboard
  '/admin/overview',    // legacy stub, not in nav
  '/org-dashboard',     // admin-only
  '/admin/org',         // stub, not in nav
  '/admin/users',
  '/admin/teams',
  '/admin/roles',       // stub, not in nav
  '/admin/invite',      // deprecated drawer, not in nav
  '/admin/usage',
  '/admin/billing',
  '/admin/security',    // stub, not in nav
  '/admin/templates',
  '/admin/templates/builder',
  '/admin/templates/custom-fields',
  '/admin/workspaces',
  '/admin/projects',
  '/admin/archive',     // redirect to /admin/trash, not in nav
  '/admin/trash',
];

/** Routes intentionally hidden from admin nav (stubs, redirects, deprecated) */
const HIDDEN_ADMIN_ROUTES = [
  '/admin/home',
  '/admin/overview',
  '/admin/org',
  '/admin/roles',
  '/admin/invite',
  '/admin/security',
  '/admin/archive',
];

describe('admin route registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('every nav path (ADMIN) exists in the router', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const navPaths = collectAllPaths(buildAdminNavItems({ platformRole: 'ADMIN' }));

    for (const p of navPaths) {
      expect(ADMIN_ROUTES_IN_ROUTER).toContain(p);
    }
  });

  it('every navigable route is either in nav or explicitly hidden', () => {
    mockIsPlatformAdmin.mockReturnValue(true);
    const navPaths = new Set(collectAllPaths(buildAdminNavItems({ platformRole: 'ADMIN' })));
    const hiddenSet = new Set(HIDDEN_ADMIN_ROUTES);

    for (const route of ADMIN_ROUTES_IN_ROUTER) {
      const inNav = navPaths.has(route);
      const isHidden = hiddenSet.has(route);
      expect(inNav || isHidden).toBe(true);
    }
  });

  it('hidden routes do NOT appear in nav for any user', () => {
    // Check both admin and non-admin nav
    for (const isAdmin of [true, false]) {
      mockIsPlatformAdmin.mockReturnValue(isAdmin);
      const navPaths = new Set(
        collectAllPaths(buildAdminNavItems(isAdmin ? { platformRole: 'ADMIN' } : null)),
      );
      for (const hidden of HIDDEN_ADMIN_ROUTES) {
        expect(navPaths.has(hidden)).toBe(false);
      }
    }
  });

  it('admin-only nav paths (/org-dashboard) do not appear for MEMBER', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const memberPaths = collectAllPaths(buildAdminNavItems({ platformRole: 'MEMBER' }));
    expect(memberPaths).not.toContain('/org-dashboard');
  });

  it('admin-only nav paths (/org-dashboard) do not appear for VIEWER', () => {
    mockIsPlatformAdmin.mockReturnValue(false);
    const viewerPaths = collectAllPaths(buildAdminNavItems({ platformRole: 'VIEWER' }));
    expect(viewerPaths).not.toContain('/org-dashboard');
  });
});

// ─── 4E-1: Dead nav config guard ────────────────────────────

describe('dead admin nav configs must not exist', () => {
  const fs = require('fs');
  const path = require('path');
  const srcRoot = path.resolve(__dirname, '../../..');

  const deadFiles = [
    'components/layouts/admin-nav.config.ts',
    'components/layouts/AdminLayout.tsx',
    'pages/admin/AdminLayout.tsx',
  ];

  for (const file of deadFiles) {
    it(`${file} must not exist (deleted dead code)`, () => {
      const fullPath = path.join(srcRoot, file);
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  }
});
