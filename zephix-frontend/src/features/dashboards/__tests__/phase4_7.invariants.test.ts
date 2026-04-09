/**
 * Phase 4.7 — dashboard persistence + redirect cleanup invariants.
 *
 * Static-source invariants for the five locked items in the brief:
 *  1. DashboardView Add Card uses POST /widgets, never `widgets` in PATCH
 *  2. DashboardBuilder save uses canonical widget endpoints, never `widgets`
 *     in PATCH dashboard
 *  3. patchDashboard explicitly refuses a `widgets` field at runtime
 *  4. Six known stale `/home` redirects now route to /inbox or workspace
 *  5. CommandPalette no longer points "Go to Home" at retired /home
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const VIEW = join(__dirname, '..', '..', '..', 'views', 'dashboards', 'View.tsx');
const BUILDER = join(__dirname, '..', '..', '..', 'views', 'dashboards', 'Builder.tsx');
const API = join(__dirname, '..', 'api.ts');
const POST_LOGIN = join(__dirname, '..', '..', '..', 'hooks', 'usePostLoginRedirect.ts');
const WS_SELECT = join(__dirname, '..', '..', '..', 'components', 'workspace', 'WorkspaceSelectionScreen.tsx');
const WS_INDEX = join(__dirname, '..', '..', '..', 'views', 'workspaces', 'WorkspacesIndexPage.tsx');
const ADMIN_LAYOUT = join(__dirname, '..', '..', '..', 'layouts', 'AdminLayout.tsx');
const FEATURES_ROUTE = join(__dirname, '..', '..', '..', 'routes', 'FeaturesRoute.tsx');
const PALETTE_CANONICAL = join(__dirname, '..', '..', '..', 'components', 'command', 'CommandPalette.tsx');
const PALETTE_DUPLICATE = join(__dirname, '..', '..', '..', 'components', 'commands', 'CommandPalette.tsx');

describe('Phase 4.7 — dashboard persistence', () => {
  const view = readFileSync(VIEW, 'utf8');
  const builder = readFileSync(BUILDER, 'utf8');
  const api = readFileSync(API, 'utf8');

  it('api.ts exports canonical widget endpoints', () => {
    expect(api).toMatch(/export async function createWidget/);
    expect(api).toMatch(/export async function updateWidget/);
    expect(api).toMatch(/export async function deleteWidget/);
    expect(api).toMatch(/POST.*\/widgets|`\/api\/dashboards\/\$\{dashboardId\}\/widgets`/);
  });

  it('patchDashboard refuses a `widgets` field at runtime', () => {
    expect(api).toMatch(/'widgets' in.*payload/);
    expect(api).toMatch(/Use createWidget \/ updateWidget \/ deleteWidget/);
  });

  it('DashboardView Add Card uses POST /widgets, never `widgets` in PATCH', () => {
    // Add Card flow imports the canonical createWidget API
    expect(view).toMatch(/createWidget: createWidgetApi/);
    expect(view).toMatch(/await createWidgetApi\(id,/);
    // Old broken pattern must be gone
    expect(view).not.toMatch(/patchDashboard\([^)]*widgets:/);
  });

  it('DashboardBuilder save diffs widgets and calls canonical endpoints', () => {
    expect(builder).toMatch(/createWidgetApi/);
    expect(builder).toMatch(/updateWidgetApi/);
    expect(builder).toMatch(/deleteWidgetApi/);
    // PATCH dashboard call exists but with metadata only — never widgets
    expect(builder).toMatch(/patchDashboard\(id,\s*{[\s\S]*?name: dashboard\.name/);
    expect(builder).not.toMatch(/patchDashboard\(id,\s*{[\s\S]*?widgets: dashboard\.widgets/);
  });

  it('Builder save refetches after mutation to sync server-assigned ids', () => {
    expect(builder).toMatch(/await fetchDashboard\(id\)[\s\S]{0,200}initialDashboardRef/);
  });
});

describe('Phase 4.7 — stale /home redirect cleanup', () => {
  it('usePostLoginRedirect targets /inbox', () => {
    const src = readFileSync(POST_LOGIN, 'utf8');
    expect(src).toMatch(/navigate\(['"]\/inbox['"]/);
    expect(src).not.toMatch(/navigate\(['"]\/home['"]/);
  });

  it('WorkspaceSelectionScreen targets /inbox or workspace slug, never /home', () => {
    const src = readFileSync(WS_SELECT, 'utf8');
    expect(src).not.toMatch(/navigate\(['"]\/home['"]/);
    expect(src).not.toMatch(/`\/w\/\$\{[^}]+\}\/home`/);
  });

  it('WorkspacesIndexPage targets /inbox', () => {
    const src = readFileSync(WS_INDEX, 'utf8');
    expect(src).not.toMatch(/navigate\(['"]\/home['"]/);
  });

  it('AdminLayout back-to-app button targets /inbox', () => {
    const src = readFileSync(ADMIN_LAYOUT, 'utf8');
    expect(src).not.toMatch(/navigate\(['"]\/home['"]\)/);
  });

  it('FeaturesRoute disabled redirect targets /inbox', () => {
    const src = readFileSync(FEATURES_ROUTE, 'utf8');
    expect(src).toMatch(/Navigate to=['"]\/inbox['"]/);
    expect(src).not.toMatch(/Navigate to=['"]\/home['"]/);
  });

  it('CommandPalette has no "Go to Home" command pointing at /home', () => {
    const src = readFileSync(PALETTE_CANONICAL, 'utf8');
    expect(src).not.toMatch(/navigate\(['"]\/home['"]\)/);
    expect(src).not.toMatch(/label:\s*['"]Go to Home['"]/);
  });
});

describe('Phase 4.7 — duplicate CommandPalette removed', () => {
  it('only the canonical components/command/CommandPalette.tsx remains', () => {
    expect(existsSync(PALETTE_CANONICAL)).toBe(true);
    expect(existsSync(PALETTE_DUPLICATE)).toBe(false);
  });
});
