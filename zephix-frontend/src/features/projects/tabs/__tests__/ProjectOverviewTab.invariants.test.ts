/**
 * Phase 5A.5 / 5A.6 — Overview shell invariants (static source).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const OVERVIEW = join(__dirname, '..', 'ProjectOverviewTab.tsx');

describe('ProjectOverviewTab — Phase 5A.5 / 5A.6', () => {
  const src = readFileSync(OVERVIEW, 'utf8');

  it('dedupes needsAttention and nextActions into one immediate-actions module', () => {
    expect(src).toMatch(/data-testid="project-overview-immediate-actions"/);
    expect(src).toMatch(/immediateActionItems/);
    expect(src).not.toMatch(/>Needs Attention</);
    expect(src).not.toMatch(/>Next Actions</);
  });

  it('caps immediate actions at five with Activities deep-link', () => {
    expect(src).toMatch(/\.slice\(0,\s*5\)/);
    expect(src).toMatch(/All in Activities/);
  });

  it('reads overview from ProjectContext (single fetch in layout)', () => {
    expect(src).toMatch(/overviewSnapshot/);
    expect(src).toMatch(/refreshOverviewSnapshot/);
  });

  it('drops the duplicate Project Details card (metadata lives in ProjectMetadataCard)', () => {
    expect(src).not.toMatch(/>Project Details</);
  });

  it('uses project.workspaceId for workspace-scoped API headers when available', () => {
    expect(src).toMatch(/effectiveWorkspaceId/);
    expect(src).toMatch(/project\?\.workspaceId/);
  });

  it('collapses cost/KPI rail into details (not first-screen noise)', () => {
    expect(src).toMatch(/Cost &amp; advanced metrics/);
    expect(src).toMatch(/<details/);
  });
});
