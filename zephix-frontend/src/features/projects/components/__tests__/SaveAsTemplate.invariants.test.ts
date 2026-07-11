/**
 * Phase 4 (Template Center) — Save as template invariants.
 *
 * Static-source invariants for SaveAsTemplateModal + ProjectPageLayout
 * ellipsis menu wiring. These tests prove the invariants without
 * mounting React, matching the style of ProjectMetadataCard.invariants.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const MODAL_PATH = join(__dirname, '..', 'SaveAsTemplateModal.tsx');
const LAYOUT_PATH = join(
  __dirname,
  '..',
  '..',
  'layout',
  'ProjectPageLayout.tsx',
);
const HEADER_MENU_PATH = join(__dirname, '..', 'ProjectHeaderActionsMenu.tsx');
const API_PATH = join(__dirname, '..', '..', 'projects.api.ts');

describe('SaveAsTemplateModal — Phase 4 invariants', () => {
  const modal = readFileSync(MODAL_PATH, 'utf8');

  it('calls projectsApi.saveProjectAsTemplate', () => {
    expect(modal).toMatch(/projectsApi\.saveProjectAsTemplate\(/);
  });

  it('default name is "<source> Template"', () => {
    expect(modal).toMatch(/`\$\{projectName\} Template`/);
  });

  it('warns that live work data is not captured', () => {
    expect(modal).toMatch(/assignees, dates, comments/i);
  });

  it('TC-F3: includes manifest checkboxes and category', () => {
    expect(modal).toMatch(/save-as-template-manifest/);
    expect(modal).toMatch(/save-as-template-category/);
    expect(modal).toMatch(/View in Template Center/);
  });
});

describe('projectsApi.saveProjectAsTemplate — Phase 4 invariants', () => {
  const api = readFileSync(API_PATH, 'utf8');

  it('POSTs to /projects/:id/save-as-template', () => {
    expect(api).toMatch(/`\/projects\/\$\{id\}\/save-as-template`/);
  });
});

describe('ProjectPageLayout — Phase 4 / 4.6 invariants', () => {
  const layout = readFileSync(LAYOUT_PATH, 'utf8');
  const headerMenu = readFileSync(HEADER_MENU_PATH, 'utf8');
  const HOOK_PATH = join(
    __dirname,
    '..',
    '..',
    'hooks',
    'useProjectPermissions.ts',
  );
  const hook = readFileSync(HOOK_PATH, 'utf8');

  it('gates project actions via useProjectPermissions, never raw role strings', () => {
    // Phase 4.6 hotfix: layout must NOT compare against the wrong vocabulary
    expect(layout).not.toMatch(/role === ['"]workspace_owner['"]/);
    expect(layout).not.toMatch(/role === ['"]org_admin['"]/);
    expect(headerMenu).toMatch(/useProjectPermissions/);
    expect(headerMenu).toMatch(/canSaveAsTemplate/);
    expect(headerMenu).toMatch(/canDuplicateProject/);
  });

  it('useProjectPermissions normalizes the real role vocabulary returned by /workspaces/:id/role', () => {
    // The backend endpoint returns 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST'
    expect(hook).toMatch(/'OWNER'/);
    expect(hook).toMatch(/'ADMIN'/);
    expect(hook).toMatch(/'MEMBER'/);
    expect(hook).toMatch(/'GUEST'/);
    // Duplicate remains elevated OWNER/ADMIN; Save as template is platform ADMIN
    expect(hook).toMatch(/ELEVATED[\s\S]{0,100}OWNER[\s\S]{0,100}ADMIN/);
    expect(hook).toMatch(/canSaveAsTemplate:\s*isPlatformAdmin/);
  });

  it('useProjectPermissions reads role for the project workspace, not the active one', () => {
    expect(hook).toMatch(/project\?\.workspaceId/);
    // Must NOT reach into the global active workspace store
    expect(hook).not.toMatch(/useWorkspaceStore/);
  });

  it('renders Save as template menu item', () => {
    expect(headerMenu).toMatch(/data-testid="project-action-save-as-template"/);
  });

  it('renders Duplicate as project menu item', () => {
    expect(headerMenu).toMatch(/data-testid="project-action-duplicate"/);
  });

  it('mounts SaveAsTemplateModal with current project', () => {
    expect(layout).toMatch(/SaveAsTemplateModal[\s\S]{0,200}projectId=\{project\.id\}/);
  });
});
