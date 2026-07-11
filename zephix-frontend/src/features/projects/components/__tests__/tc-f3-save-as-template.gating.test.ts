/**
 * TC-F3 — Save-as-Template dialog gating.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  SAVE_AS_TEMPLATE_DIALOG_DEFAULTS,
  buildSaveAsTemplatePayload,
  MANIFEST_CHECKBOX_META,
} from '@/features/projects/saveAsTemplateManifest';

const MODAL = join(__dirname, '..', 'SaveAsTemplateModal.tsx');
const HOOK = join(__dirname, '..', '..', 'hooks', 'useProjectPermissions.ts');
const HEADER = join(__dirname, '..', 'ProjectHeaderActionsMenu.tsx');
const SIDEBAR = join(
  __dirname,
  '..',
  '..',
  '..',
  'workspaces',
  'SidebarWorkspaces.tsx',
);
const API = join(__dirname, '..', '..', 'projects.api.ts');
const ROUTE = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'pages',
  'templates',
  'TemplateCenterPageRoute.tsx',
);

describe('TC-F3 admin-only visibility', () => {
  it('canSaveAsTemplate uses isPlatformAdmin capability helper', () => {
    const hook = readFileSync(HOOK, 'utf8');
    expect(hook).toMatch(/isPlatformAdmin\(user\)/);
    expect(hook).toMatch(/canSaveAsTemplate:\s*isPlatformAdmin/);
    expect(hook).not.toMatch(/canSaveAsTemplate:\s*normalized \? ELEVATED/);
  });

  it('header menu and sidebar gate Save as template via capability', () => {
    const header = readFileSync(HEADER, 'utf8');
    expect(header).toMatch(/canSaveAsTemplate/);
    expect(header).toMatch(/project-action-save-as-template/);
    expect(header).not.toMatch(/platformRole\s*===/);
    const sidebar = readFileSync(SIDEBAR, 'utf8');
    expect(sidebar).toMatch(/canSaveProjectAsTemplate/);
    expect(sidebar).toMatch(/isPlatformAdmin\(user\)/);
    expect(sidebar).toMatch(/sidebar-project-save-template/);
  });
});

describe('TC-F3 checkbox payload mapping', () => {
  it('dialog defaults match approved design (tasks/docs off)', () => {
    expect(SAVE_AS_TEMPLATE_DIALOG_DEFAULTS).toEqual({
      includeStatuses: true,
      includeFields: true,
      includeViews: true,
      includePhases: true,
      includeSampleTasks: false,
      includeDocuments: false,
      includeGovernance: true,
    });
    expect(MANIFEST_CHECKBOX_META.map((m) => m.key)).toEqual([
      'includeStatuses',
      'includeFields',
      'includeViews',
      'includePhases',
      'includeSampleTasks',
      'includeDocuments',
      'includeGovernance',
    ]);
  });

  it('buildSaveAsTemplatePayload maps name/category/manifest into API body', () => {
    const payload = buildSaveAsTemplatePayload({
      name: '  Alpha Template  ',
      description: '  desc  ',
      category: 'Software Development',
      manifest: {
        ...SAVE_AS_TEMPLATE_DIALOG_DEFAULTS,
        includeSampleTasks: true,
      },
    });
    expect(payload).toEqual({
      name: 'Alpha Template',
      description: 'desc',
      category: 'Software Development',
      includeStatuses: true,
      includeFields: true,
      includeViews: true,
      includePhases: true,
      includeSampleTasks: true,
      includeDocuments: false,
      includeGovernance: true,
    });
  });

  it('modal wires checkboxes, category dropdown, and API payload builder', () => {
    const modal = readFileSync(MODAL, 'utf8');
    expect(modal).toMatch(/save-as-template-manifest/);
    expect(modal).toMatch(/save-as-template-include-\$\{item\.key\}/);
    expect(modal).toMatch(/MANIFEST_CHECKBOX_META/);
    expect(modal).toMatch(/SAVE_AS_TEMPLATE_DIALOG_DEFAULTS/);
    expect(modal).toMatch(/save-as-template-category/);
    expect(modal).toMatch(/PROJECT_TEMPLATE_CATEGORIES/);
    expect(modal).toMatch(/buildSaveAsTemplatePayload/);
    expect(modal).toMatch(/save-as-template-sample-tasks-warning/);
    const api = readFileSync(API, 'utf8');
    expect(api).toMatch(/includeSampleTasks/);
    expect(api).toMatch(/includeDocuments/);
    expect(api).toMatch(/includeGovernance/);
  });
});

describe('TC-F3 success flow', () => {
  it('toast links View in Template Center to Your templates tier', () => {
    const modal = readFileSync(MODAL, 'utf8');
    expect(modal).toMatch(/View in Template Center/);
    expect(modal).toMatch(/\/templates\?tier=Your%20templates/);
    expect(modal).toMatch(/zephix:templates:invalidate/);
    const route = readFileSync(ROUTE, 'utf8');
    expect(route).toMatch(/searchParams\.get\(['"]tier['"]\)/);
    expect(route).toMatch(/initialCategory/);
  });
});
