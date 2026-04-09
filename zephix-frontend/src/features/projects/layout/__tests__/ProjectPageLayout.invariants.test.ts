/**
 * Phase 2 invariant tests for project shell.
 *
 * Static source-level tests verifying HR3 (only 4 visible tabs in MVP shell):
 *   - Overview
 *   - Activities (mapped to existing /tasks route)
 *   - Board
 *   - Gantt
 *
 * Other tabs may exist as routes but must not be in the visible PROJECT_TABS list.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const LAYOUT_PATH = join(__dirname, '..', 'ProjectPageLayout.tsx');
const IDENTITY_PATH = join(__dirname, '..', '..', 'components', 'ProjectIdentityFrame.tsx');

describe('ProjectPageLayout — HR3 visible tab rule', () => {
  const source = readFileSync(LAYOUT_PATH, 'utf8');

  it('declares MVP_VISIBLE_TAB_IDS with exactly the 4 approved tabs', () => {
    expect(source).toMatch(/MVP_VISIBLE_TAB_IDS/);
    // Find the set declaration and check membership
    const setMatch = source.match(/MVP_VISIBLE_TAB_IDS\s*=\s*new Set\(\[([^\]]+)\]/);
    expect(setMatch).not.toBeNull();
    const ids = setMatch![1];
    expect(ids).toContain("'overview'");
    expect(ids).toContain("'tasks'");
    expect(ids).toContain("'board'");
    expect(ids).toContain("'gantt'");
  });

  it('PROJECT_TABS is filtered through MVP_VISIBLE_TAB_IDS', () => {
    expect(source).toMatch(
      /PROJECT_TABS\s*=\s*PROJECT_TABS_ALL\.filter\(\(t\)\s*=>\s*MVP_VISIBLE_TAB_IDS\.has/,
    );
  });

  it('renames Tasks label to Activities', () => {
    expect(source).toMatch(/label:\s*'Activities'/);
  });
});

describe('ProjectPageLayout — Phase 5A.5 workspace breadcrumb truth', () => {
  const source = readFileSync(LAYOUT_PATH, 'utf8');

  it('breadcrumb nav is labeled for accessibility', () => {
    expect(source).toMatch(/aria-label="Breadcrumb"/);
  });

  it('links parent segment to workspace home using project.workspaceId', () => {
    expect(source).toMatch(/to=\{`\/workspaces\/\$\{project\.workspaceId\}\/home`\}/);
  });

  it('breadcrumb block does not use a generic Projects parent link', () => {
    const idx = source.indexOf('aria-label="Breadcrumb"');
    expect(idx).toBeGreaterThan(-1);
    const slice = source.slice(idx, idx + 900);
    expect(slice).not.toMatch(/<span>Projects<\/span>/);
    expect(slice).not.toMatch(/to="\/projects"/);
  });

  it('uses semantic ol/li trail (not a faux back chevron before workspace)', () => {
    expect(source).toMatch(/<ol className="flex flex-wrap items-center/);
    expect(source).not.toMatch(/ChevronLeft/);
  });

  it('ProjectContext carries workspaceDisplayName for child routes', () => {
    expect(source).toMatch(/workspaceDisplayName/);
    expect(source).toMatch(/getWorkspace\(/);
  });

  it('Phase 5A.6: workspace-owned identity frame + overview snapshot in context', () => {
    expect(source).toMatch(/ProjectIdentityFrame/);
    expect(source).toMatch(/overviewSnapshot/);
    expect(source).toMatch(/refreshOverviewSnapshot/);
    expect(source).toMatch(/normalizeProjectOverview/);
  });
});

describe('ProjectIdentityFrame — Phase 5A.6', () => {
  const source = readFileSync(IDENTITY_PATH, 'utf8');

  it('exposes test id and in-workspace copy', () => {
    expect(source).toMatch(/data-testid="project-identity-frame"/);
    expect(source).toMatch(/In workspace/);
  });
});
