/**
 * TC-F2 — instantiate flow + browse refresh gating.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  mapTemplateDto,
  resolveCatalogTier,
  resolveSetupBadge,
  readTemplateDocKey,
  readRecommendedPolicyCodes,
  readRecommendedPolicyBundle,
  resolvePostInstantiateProjectPath,
} from '@/features/templates/template.mapper';
import { CATALOG_TIER_CATEGORIES } from '@/features/templates/categories';

const MODAL = join(__dirname, '..', 'components', 'TemplateCenterModal.tsx');
const FLOW = join(__dirname, '..', 'components', 'UseTemplateFlowModal.tsx');
const PREVIEW = join(__dirname, '..', 'components', 'TemplatePreviewModal.tsx');

describe('TC-F2 catalog tiers + setup badges', () => {
  it('maps starter / methodology / domain codes to tier categories', () => {
    const starter = mapTemplateDto({
      id: '1',
      name: 'Simple Project',
      kind: 'project',
      template_scope: 'SYSTEM',
      template_code: 'starter_simple_project_v1',
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    const methodology = mapTemplateDto({
      id: '2',
      name: 'Waterfall',
      kind: 'project',
      template_scope: 'SYSTEM',
      template_code: 'pm_waterfall_v2',
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    const domain = mapTemplateDto({
      id: '3',
      name: 'Bug Tracker',
      kind: 'project',
      template_scope: 'SYSTEM',
      template_code: 'bug_tracker_v1',
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    const org = mapTemplateDto({
      id: '4',
      name: 'Org',
      kind: 'project',
      template_scope: 'ORG',
      is_active: true,
      is_default: false,
      is_system: false,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });

    expect(resolveCatalogTier(starter)).toBe('Starters');
    expect(resolveCatalogTier(methodology)).toBe('Methodology');
    expect(resolveCatalogTier(domain)).toBe('Domain');
    expect(resolveCatalogTier(org)).toBe('Your templates');
    expect(CATALOG_TIER_CATEGORIES).toContain('Starters');
  });

  it('prefers metadata.setup for Setup badges', () => {
    const tpl = mapTemplateDto({
      id: '1',
      name: 'S',
      kind: 'project',
      template_scope: 'SYSTEM',
      metadata: { setup: 'Advanced', purpose: 'x' },
      phases: [{ name: 'A', order: 0 }],
      task_templates: [{ name: 't', phaseOrder: 0 }],
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(resolveSetupBadge(tpl)).toBe('Advanced');
  });

  it('reads document docKey and governance recommendation metadata', () => {
    const doc = mapTemplateDto({
      id: 'd1',
      name: 'Charter',
      kind: 'document',
      template_scope: 'SYSTEM',
      metadata: {
        docKey: 'project-charter',
        recommendedPolicyCodes: ['risk-threshold-alert'],
        recommendedPolicyBundle: 'STANDARD',
      },
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(readTemplateDocKey(doc)).toBe('project-charter');
    expect(readRecommendedPolicyCodes(doc)).toEqual(['risk-threshold-alert']);
    expect(readRecommendedPolicyBundle(doc)).toBe('STANDARD');
  });

  it('honors defaultView after instantiate', () => {
    const tpl = mapTemplateDto({
      id: '1',
      name: 'Board',
      kind: 'project',
      template_scope: 'SYSTEM',
      column_config: { default_view: 'board' },
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(resolvePostInstantiateProjectPath(tpl, 'p1')).toBe('/projects/p1/board');
  });
});

describe('TC-F2 flow + browse wiring invariants', () => {
  it('UseTemplateFlowModal exposes the four steps including ATTACH-GOVERNANCE', () => {
    const src = readFileSync(FLOW, 'utf8');
    expect(src).toMatch(/use-template-step-name/);
    expect(src).toMatch(/use-template-step-dates/);
    expect(src).toMatch(/use-template-step-capabilities/);
    expect(src).toMatch(/use-template-step-governance/);
    expect(src).toMatch(/use-template-skip-governance/);
    expect(src).toMatch(/instantiateV51\(/);
    expect(src).toMatch(/patchProjectCapabilities/);
    expect(src).toMatch(/use-template-governance-lean-copy/);
  });

  it('TemplateCenterModal wires preferred PATCH, document attach, and tier rail', () => {
    const src = readFileSync(MODAL, 'utf8');
    expect(src).toMatch(/setTemplatePreferred/);
    expect(src).toMatch(/AttachDocumentModal/);
    expect(src).toMatch(/UseTemplateFlowModal/);
    expect(src).toMatch(/CATALOG_TIER_CATEGORIES/);
    expect(src).toMatch(/Attach to project/);
    expect(src).toMatch(/kind === 'document'/);
    expect(src).not.toMatch(/Preferred toggle endpoint not wired yet/);
    // Document attach is not gated by comingSoon
    expect(src).toMatch(/isComingSoon = !isDocument && template\.comingSoon/);
  });

  it('preview interior stays hidden pre-activation', () => {
    const src = readFileSync(PREVIEW, 'utf8');
    expect(src).not.toMatch(/template-preview-phases-section/);
    expect(src).not.toMatch(/template-preview-required-section/);
    expect(src).not.toMatch(/template-preview-included-views/);
    expect(src).toMatch(/template-preview-summary-line/);
  });
});
