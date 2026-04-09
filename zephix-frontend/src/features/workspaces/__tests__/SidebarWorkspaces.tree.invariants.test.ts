/**
 * Phase 4.7.1 — sidebar workspace tree fix invariants.
 *
 * Static-source invariants for the SidebarWorkspaces row, asserting:
 *  1. The row renders an expand/collapse chevron with aria-expanded
 *  2. The chevron is hidden by default and revealed on row hover
 *  3. The chevron is rendered AFTER the workspace label button (never
 *     before the workspace icon)
 *  4. Clicking the chevron toggles tree only — onClick stops propagation
 *     and never calls handleWorkspaceSelect / navigate
 *  5. Clicking the workspace name still calls handleWorkspaceSelect
 *  6. The child project list mounts only when expanded and is fetched
 *     lazily through projectsApi.getProjects({ workspaceId })
 *  7. The chevron is hidden once we know the workspace has zero projects
 *  8. Right-aligned ellipsis (more) and plus actions still exist and are
 *     hover-revealed
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SOURCE = join(__dirname, '..', 'SidebarWorkspaces.tsx');

describe('Phase 4.7.1 — SidebarWorkspaces tree', () => {
  const src = readFileSync(SOURCE, 'utf8');

  it('imports ChevronRight from lucide', () => {
    expect(src).toMatch(/ChevronRight/);
  });

  it('renders an expand/collapse button with aria-expanded and aria-controls', () => {
    expect(src).toMatch(/data-testid=\{`workspace-row-expand-\$\{ws\.id\}`\}/);
    expect(src).toMatch(/aria-expanded=\{isExpanded\}/);
    expect(src).toMatch(/aria-controls=\{`workspace-children-\$\{ws\.id\}`\}/);
  });

  it('chevron matches the section-header pattern: always visible, not hover-gated', () => {
    // Phase 4.7.1 update: chevron lives at the left edge of the row like
    // the Workspaces / Dashboards section headers. It is NOT hover-gated.
    // When hidden (workspace has no children), an aligned placeholder
    // span keeps the icon column aligned across rows.
    expect(src).toMatch(/<span className="inline-block h-4 w-4 shrink-0" aria-hidden \/>/);
  });

  it('chevron click toggles tree only (stopPropagation, no navigate)', () => {
    // The chevron's onClick handler must call e.stopPropagation() then
    // toggleWorkspaceExpand(ws.id).
    expect(src).toMatch(
      /onClick=\{\(e\) => \{[\s\S]{0,80}stopPropagation\(\);[\s\S]{0,80}toggleWorkspaceExpand\(ws\.id\)/,
    );
  });

  it('workspace name button still calls handleWorkspaceSelect', () => {
    expect(src).toMatch(/onClick=\{\(\) => handleWorkspaceSelect\(ws\.id\)\}/);
  });

  it('chevron is rendered BEFORE the workspace name button, like the section header', () => {
    // Phase 4.7.1 update: matches the Workspaces / Dashboards section
    // header pattern where the chevron sits at the left edge.
    const nameBtn = src.indexOf('workspace-option-${ws.id}');
    const chevronBtn = src.indexOf('workspace-row-expand-${ws.id}');
    expect(nameBtn).toBeGreaterThan(-1);
    expect(chevronBtn).toBeGreaterThan(-1);
    expect(chevronBtn).toBeLessThan(nameBtn);
  });

  it('child project list mounts only when expanded and is keyed by workspace id', () => {
    expect(src).toMatch(/\{isExpanded && \(/);
    expect(src).toMatch(/data-testid=\{`workspace-children-\$\{ws\.id\}`\}/);
  });

  it('children are loaded lazily via the workspace-scoped listProjects helper', () => {
    // Phase 4.7.1 hotfix: switched to listProjects(wsId), the same proven
    // helper used by WorkspaceProjectsList. The previous projectsApi.getProjects
    // path returned 401 in some auth contexts.
    expect(src).toMatch(/listProjects\(wsId\)/);
    expect(src).toMatch(/loadWorkspaceProjects/);
    expect(src).toMatch(/!wsProjects\[wsId\] && !wsProjectsLoading\[wsId\]/);
  });

  it('error path does NOT cache an empty array (chevron must stay visible after a failed expand)', () => {
    // Bug A from the screenshot: setting wsProjects[wsId] = [] in the catch
    // block made knownEmpty flip true and hid the chevron permanently. The
    // catch block must only set the error message, never poison the cache.
    expect(src).toMatch(/Do NOT cache an empty array on error/);
    // The catch block must not assign [] into wsProjects.
    expect(src).not.toMatch(
      /catch[\s\S]{0,300}setWsProjects\(\(m\)\s*=>\s*\(\{\s*\.\.\.m,\s*\[wsId\]:\s*\[\]/,
    );
  });

  it('error state offers a Retry button instead of a dead red string', () => {
    expect(src).toMatch(/data-testid=\{`workspace-children-retry-\$\{ws\.id\}`\}/);
    expect(src).toMatch(/void loadWorkspaceProjects\(ws\.id\)/);
  });

  it('chevron is hidden once we know the workspace has zero projects', () => {
    expect(src).toMatch(/knownEmpty/);
    expect(src).toMatch(/childrenLoaded\.length === 0/);
    expect(src).toMatch(/chevronVisible = !knownEmpty/);
  });

  it('right-aligned ellipsis and plus actions still exist and are hover-revealed', () => {
    expect(src).toMatch(/data-testid=\{`workspace-row-more-\$\{ws\.id\}`\}/);
    expect(src).toMatch(/data-testid=\{`workspace-plus-button-\$\{ws\.id\}`\}/);
    // Right-side action group still uses the existing hover gating.
    expect(src).toMatch(/md:opacity-0 md:group-hover\/ws-row:opacity-100/);
  });

  it('child project rows navigate to the bare project route, not toggle the tree', () => {
    // Step 1 route contract fix: the router has no `/overview` child route.
    // Sidebar must navigate to the bare `/projects/:id` index route so that
    // ProjectPageLayout's index element (ProjectOverviewTab) handles the
    // landing, including the Waterfall-redirects-to-/tasks behavior.
    // Asserting `/overview` here previously locked the broken contract in.
    expect(src).toMatch(/navigate\(`\/projects\/\$\{p\.id\}`\)/);
    expect(src).not.toMatch(/navigate\(`\/projects\/\$\{p\.id\}\/overview`\)/);
  });

  it('each project row exposes a … actions control for sidebar parity', () => {
    expect(src).toMatch(/sidebar-project-more-/);
    expect(src).toMatch(/Invite to project/);
  });

  it('workspace Archive/Delete are org platform admin only (same gate as New workspace)', () => {
    expect(src).toMatch(
      /canCreateWorkspace\s*\?\s*\([\s\S]*workspace-row-archive-[\s\S]*workspace-row-delete-/,
    );
  });
});
