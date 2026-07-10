/**
 * TC-F1 — Template DTO mapping, browse unification, and routing helpers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  mapTemplateDto,
  matchesKindFilter,
  isOrgPreferredTemplate,
  resolvePostInstantiateProjectPath,
  deriveSetupLevel,
} from '@/features/templates/template.mapper';

const PREVIEW_MODAL = join(
  __dirname,
  '..',
  'components',
  'TemplatePreviewModal.tsx',
);
const ROUTE_SWITCH = join(__dirname, '..', '..', '..', 'pages', 'templates', 'TemplateRouteSwitch.tsx');

describe('TC-F1 template mapper', () => {
  it('maps snake_case backend fields into TemplateDto', () => {
    const dto = mapTemplateDto({
      id: 'tpl-1',
      name: 'Hybrid rollout',
      kind: 'project',
      template_scope: 'ORG',
      is_preferred: true,
      usage_count: 12,
      default_tabs: ['overview', 'board'],
      column_config: { default_view: 'board', visibleTabs: ['overview', 'board'] },
      status_groups: [{ name: 'Todo', statuses: [] }],
      is_active: true,
      is_default: false,
      is_system: false,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      default_enabled_kpis: [],
    });

    expect(dto.isPreferred).toBe(true);
    expect(dto.usageCount).toBe(12);
    expect(dto.defaultTabs).toEqual(['overview', 'board']);
    expect(dto.columnConfig?.defaultView).toBe('board');
    expect(dto.statusGroups).toHaveLength(1);
  });

  it('filters templates by kind', () => {
    const project = mapTemplateDto({ id: '1', name: 'P', kind: 'project', template_scope: 'ORG', is_active: true, is_default: false, is_system: false, lock_state: 'UNLOCKED', version: 1, created_at: '', updated_at: '', default_enabled_kpis: [] });
    const doc = mapTemplateDto({ id: '2', name: 'D', kind: 'document', template_scope: 'ORG', is_active: true, is_default: false, is_system: false, lock_state: 'UNLOCKED', version: 1, created_at: '', updated_at: '', default_enabled_kpis: [] });
    expect(matchesKindFilter(project, 'projects')).toBe(true);
    expect(matchesKindFilter(doc, 'projects')).toBe(false);
    expect(matchesKindFilter(doc, 'documents')).toBe(true);
  });

  it('detects org-preferred templates for the recommended shelf', () => {
    const preferred = mapTemplateDto({
      id: '1',
      name: 'Org pick',
      kind: 'project',
      template_scope: 'ORG',
      is_preferred: true,
      is_active: true,
      is_default: false,
      is_system: false,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    const system = mapTemplateDto({
      id: '2',
      name: 'System',
      kind: 'project',
      template_scope: 'SYSTEM',
      is_preferred: true,
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(isOrgPreferredTemplate(preferred)).toBe(true);
    expect(isOrgPreferredTemplate(system)).toBe(false);
  });

  it('honors columnConfig.defaultView for post-instantiate navigation', () => {
    const tpl = mapTemplateDto({
      id: '1',
      name: 'Board first',
      kind: 'project',
      template_scope: 'ORG',
      column_config: { default_view: 'board' },
      is_active: true,
      is_default: false,
      is_system: false,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(resolvePostInstantiateProjectPath(tpl, 'proj-9')).toBe('/projects/proj-9/board');
  });

  it('derives Simple/Standard/Rich setup levels', () => {
    const simple = mapTemplateDto({
      id: '1',
      name: 'S',
      kind: 'project',
      template_scope: 'ORG',
      phases: [{ name: 'A', order: 0 }],
      task_templates: [{ name: 't', phaseOrder: 0 }],
      is_active: true,
      is_default: false,
      is_system: false,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(deriveSetupLevel(simple)).toBe('Simple');
  });
});

describe('TC-F1 browse unification', () => {
  it('/templates route uses thin TemplateCenterPageRoute wrapper', () => {
    const src = readFileSync(ROUTE_SWITCH, 'utf8');
    expect(src).toMatch(/TemplateCenterPageRoute/);
    expect(src).not.toMatch(/views\/templates\/TemplateCenter/);
  });
});

describe('TC-F1 hidden interior assertion', () => {
  it('preview modal does not render pre-activation includes manifest sections', () => {
    const src = readFileSync(PREVIEW_MODAL, 'utf8');
    expect(src).not.toMatch(/template-preview-phases-section/);
    expect(src).not.toMatch(/template-preview-required-section/);
    expect(src).not.toMatch(/template-preview-included-views/);
    expect(src).toMatch(/template-preview-summary-line/);
  });
});
