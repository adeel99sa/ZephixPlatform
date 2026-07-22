/**
 * TC-F2b — Stage-2 defect fixes (documents tab, admin Overview, attach CTA, Lean governance copy).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { TAB_ORDER, readVisibleTabIds } from '@/features/projects/layout/projectVisibleTabs';
import {
  stripLegacyVisibleTabs,
  columnConfigHasLegacyTabs,
} from '@/features/projects/layout/stripLegacyVisibleTabs';
import { ADMINISTRATION_NAV_GROUPS } from '@/features/administration/constants';

const APP = join(__dirname, '..', '..', '..', 'App.tsx');
const LAYOUT = join(__dirname, '..', '..', 'projects', 'layout', 'ProjectPageLayout.tsx');
const DOC_TAB = join(
  __dirname,
  '..',
  '..',
  'projects',
  'tabs',
  'ProjectDocumentWorkflowTab.tsx',
);
const MODAL = join(__dirname, '..', 'components', 'TemplateCenterModal.tsx');
const FLOW = join(__dirname, '..', 'components', 'UseTemplateFlowModal.tsx');
const ATTACH = join(__dirname, '..', 'components', 'AttachDocumentModal.tsx');
const ADMIN_CONST = join(
  __dirname,
  '..',
  '..',
  'administration',
  'constants.ts',
);

describe('TC-F2b D1 — Documents tab mounts document_instances reader', () => {
  it('TAB_ORDER includes documents and stripLegacy keeps it', () => {
    expect(TAB_ORDER).toContain('documents');
    const next = stripLegacyVisibleTabs({
      visibleTabs: ['overview', 'documents', 'risks', 'project_artifacts'],
    });
    // SESSION-FRONTEND-1 Item 3: risks is a live tab again; only project_artifacts is legacy.
    expect(next.visibleTabs).toEqual(['overview', 'documents', 'risks']);
    expect(columnConfigHasLegacyTabs({ visibleTabs: ['documents'] })).toBe(false);
    expect(
      readVisibleTabIds({ visibleTabs: ['overview', 'documents', 'tasks'] }),
    ).toContain('documents');
  });

  it('App mounts ProjectDocumentWorkflowTab and keeps Tools dropdown as aliases', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).toMatch(/ProjectDocumentWorkflowTab/);
    expect(app).toMatch(/path="documents"\s+element=\{<ProjectDocumentWorkflowTab/);
    expect(app).toMatch(/path="tools\/docs"/);
    expect(app).toMatch(/path="tools\/workflow"/);
    expect(app).toMatch(/Navigate to="\.\.\/documents"/);
  });

  it('layout declares Documents tab and workflow tab reads instances API', () => {
    const layout = readFileSync(LAYOUT, 'utf8');
    expect(layout).toMatch(/id:\s*'documents'/);
    expect(layout).toMatch(/label:\s*'Documents'/);
    const tab = readFileSync(DOC_TAB, 'utf8');
    expect(tab).toMatch(/listProjectDocumentWorkflow/);
    expect(tab).toMatch(/documentWorkflow\.api/);
    expect(tab).toMatch(/data-testid="document-workflow-root"/);
    const api = readFileSync(
      join(__dirname, '..', '..', 'documents', 'documentWorkflow.api.ts'),
      'utf8',
    );
    expect(api).toMatch(/template-center\/projects\/\$\{projectId\}\/documents/);
  });
});

describe('TC-F2b #1 — Overview restored to admin sidebar', () => {
  it('Administration nav includes Overview → /administration/overview', () => {
    const adminGroup = ADMINISTRATION_NAV_GROUPS.find((g) => g.label === 'Administration');
    expect(adminGroup).toBeDefined();
    const overview = adminGroup!.items.find((i) => i.label === 'Overview');
    expect(overview?.path).toBe('/administration/overview');
    const src = readFileSync(ADMIN_CONST, 'utf8');
    expect(src).toMatch(/label:\s*"Overview"/);
    expect(src).toMatch(/path:\s*"\/administration\/overview"/);
  });
});

describe('TC-F2b #8 — AttachDocumentModal live on document cards', () => {
  it('document kind bypasses comingSoon and opens AttachDocumentModal', () => {
    const modal = readFileSync(MODAL, 'utf8');
    expect(modal).toMatch(/AttachDocumentModal/);
    expect(modal).toMatch(/kind === 'document'/);
    // comingSoon check must not precede document attach branch
    const handleIdx = modal.indexOf('const handleUseTemplate');
    const docBranch = modal.indexOf("tpl.kind === 'document'", handleIdx);
    const comingSoon = modal.indexOf('tpl.comingSoon', handleIdx);
    expect(docBranch).toBeGreaterThan(-1);
    expect(comingSoon).toBeGreaterThan(docBranch);
    expect(modal).toMatch(/isComingSoon = !isDocument && template\.comingSoon/);
    const attach = readFileSync(ATTACH, 'utf8');
    expect(attach).toMatch(/attachDocumentFromTemplate/);
    expect(attach).toMatch(/documents\/from-template/);
  });
});

describe('TC-F2b D2 — Lean governance empty-state copy + admin checkboxes', () => {
  it('shows Lean copy and admin-only policy checkboxes', () => {
    const flow = readFileSync(FLOW, 'utf8');
    expect(flow).toMatch(/use-template-governance-lean-copy/);
    expect(flow).toMatch(
      /No policies are enabled in this workspace \(Lean mode\)\. Select policies below to enable them for this workspace/,
    );
    expect(flow).toMatch(/use-template-policy-list/);
    expect(flow).toMatch(/use-template-governance-non-admin/);
    expect(flow).toMatch(/catalogPoliciesFromMeta/);
    expect(flow).toMatch(/POLICY_UI_META/);
    expect(flow).toMatch(/updateWorkspaceGovernancePolicy/);
    expect(flow).toMatch(/!isAdmin \?/);
  });
});
