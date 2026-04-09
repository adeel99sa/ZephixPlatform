/**
 * Phase 3 (Template Center) — ProjectMetadataCard invariants.
 *
 * Verifies the canonical project metadata block:
 *   - Loads per-project team via projectsApi.getProjectTeam
 *   - PM cannot be removed from team
 *   - Add/remove team members invalidates project query (Overview ↔ Activities linkage)
 *   - Methodology badge only renders when present
 *   - Team display uses projectTeamMembers (filtered), not all workspace members
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SOURCE_PATH = join(__dirname, '..', 'ProjectMetadataCard.tsx');

describe('ProjectMetadataCard — Phase 3 invariants', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8');

  it('loads project team via projectsApi.getProjectTeam', () => {
    expect(source).toMatch(/projectsApi[\s\S]{0,30}\.getProjectTeam\(project\.id\)/);
  });

  it('updates project team via projectsApi.updateProjectTeam', () => {
    expect(source).toMatch(/projectsApi\.updateProjectTeam\(project\.id/);
  });

  it('blocks removing PM from team', () => {
    expect(source).toMatch(/Project Manager cannot be removed/);
  });

  it('invalidates project query after team mutation (Overview ↔ Activities linkage)', () => {
    expect(source).toMatch(/queryClient\.invalidateQueries/);
    expect(source).toMatch(/queryKey:\s*\[['"]project['"]/);
  });

  it('filters displayed team to projectTeamMembers, not all workspace members', () => {
    expect(source).toMatch(/projectTeamMembers/);
    expect(source).toMatch(/projectTeamMembers\.map/);
  });

  it('Phase 5A.6: essentials card title (identity frame owns headline metadata)', () => {
    expect(source).toMatch(/Template &amp; plan essentials/);
    expect(source).toMatch(/data-testid="project-template-essentials-card"/);
  });

  it('only workspace members are addable (availableMembers excludes existing team)', () => {
    expect(source).toMatch(/availableMembers/);
    expect(source).toMatch(/!teamMemberIds\.includes/);
  });
});
