/**
 * Phase 3 (Template Center) — Activities behavior invariants.
 *
 * Static source-level tests verifying:
 *   - Assignee pool filters workspace members to project team (not all workspace members)
 *   - Project-level documents banner is rendered from project doc endpoint
 *   - Activities header label is "Activities" (not "Tasks")
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SOURCE_PATH = join(__dirname, '..', 'TaskListSection.tsx');

describe('TaskListSection — Phase 3 invariants', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8');

  it('imports project team API and loads team for filtering', () => {
    // Project team is loaded via dynamic import of projectsApi.getProjectTeam
    expect(source).toMatch(/getProjectTeam\(projectId\)/);
    expect(source).toMatch(/projectTeamMemberIds/);
  });

  it('exposes derived assigneePool that filters workspace members by team', () => {
    expect(source).toMatch(/const assigneePool\s*=\s*useMemo/);
    // Filter must check membership in projectTeamMemberIds
    expect(source).toMatch(/teamSet\.has\(id\)/);
  });

  it('assignee dropdowns use assigneePool, not raw workspaceMembers', () => {
    // Both inline and bulk assignee pickers must iterate assigneePool
    const occurrences = source.match(/assigneePool\.map/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it('renders project-level documents banner sourced from project doc endpoint', () => {
    expect(source).toMatch(/Project documents/);
    expect(source).toMatch(/projectDocs/);
    expect(source).toMatch(/\/work\/workspaces\/\$\{workspaceId\}\/projects\/\$\{projectId\}\/documents/);
  });

  it('Activities header label is "Activities"', () => {
    expect(source).toMatch(/>Activities</);
  });
});
