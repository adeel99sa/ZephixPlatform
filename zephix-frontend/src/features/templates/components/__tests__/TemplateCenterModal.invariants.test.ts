/**
 * Phase 1/2 invariant tests for Template Center.
 *
 * These tests are intentionally static — they read the source file as text
 * and verify hard rules that protect template instantiation truthfulness:
 *
 *   HR1: No blank-project fallback (no `POST /projects` from this flow)
 *   HR4: Menu must read the canonical NEW_TEMPLATE_ACTION_LABEL ("New Template")
 *   HR5: "Created by me" must not be present until backed by real data
 *   HR6: No hardcoded `CATEGORIES` placeholder array
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const MODAL_PATH = join(
  __dirname,
  '..',
  'TemplateCenterModal.tsx',
);

const SIDEBAR_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'workspaces',
  'SidebarWorkspaces.tsx',
);

describe('TemplateCenterModal — Hard Rules', () => {
  const modalSource = readFileSync(MODAL_PATH, 'utf8');

  it('HR1: contains no POST /projects fallback', () => {
    // The blank-project fallback used apiClient.post('/projects', ...).
    // It must not appear anywhere in this file.
    expect(modalSource).not.toMatch(/apiClient\.post\(['"]\/projects/);
    expect(modalSource).not.toMatch(/api\.post\(['"]\/projects/);
  });

  it('HR1: instantiation only happens through instantiateV51', () => {
    expect(modalSource).toMatch(/instantiateV51\(/);
  });

  it('HR1: requires a real template id before allowing instantiation', () => {
    // The handleInstantiate function must guard on pendingTemplate.id
    expect(modalSource).toMatch(/pendingTemplate\?\.id/);
  });

  it('HR5 (Phase 4): "Created by me" view is wired from real createdById data', () => {
    // Phase 4 brings the section back, but only when backed by real backend
    // ownership data — must filter by currentUserId === t.createdById, never
    // by hardcoded placeholders.
    expect(modalSource).toMatch(/id:\s*"mine"/);
    expect(modalSource).toMatch(/Created by me/);
    expect(modalSource).toMatch(/t\.createdById === currentUserId/);
  });

  it('Phase 4: Workspace templates section is wired and scoped', () => {
    expect(modalSource).toMatch(/id:\s*"workspace"/);
    expect(modalSource).toMatch(/Workspace templates/);
    expect(modalSource).toMatch(/t\.templateScope === "WORKSPACE"/);
  });

  it('Phase 4: card source label uses Mine for own WORKSPACE templates', () => {
    expect(modalSource).toMatch(/sourceLabel/);
    expect(modalSource).toMatch(/return "Mine"/);
  });

  it('HR6: no hardcoded CATEGORIES placeholder constant', () => {
    // Phase 1 deleted the hardcoded CATEGORIES array. Modal must rely on
    // backend templates from listTemplates().
    expect(modalSource).not.toMatch(/^const CATEGORIES\s*[:=]\s*\[/m);
    expect(modalSource).toMatch(/listTemplates\(\)/);
  });

  it('HR6: uses real backend TemplateDto type, not BuiltInTemplate', () => {
    expect(modalSource).not.toMatch(/BuiltInTemplate/);
    expect(modalSource).toMatch(/TemplateDto/);
  });
});

describe('Workspace sidebar menu — Hard Rules', () => {
  const sidebarSource = readFileSync(SIDEBAR_PATH, 'utf8');
  const LABELS_PATH = join(
    __dirname,
    '..',
    '..',
    'labels.ts',
  );
  const labelsSource = readFileSync(LABELS_PATH, 'utf8');

  it('HR4 (Phase 4.7.4): workspace plus menu renders the centralized NEW_TEMPLATE_ACTION_LABEL', () => {
    // The sidebar must use the centralized constant, not a hand-written
    // string. This pins both the constant import and its render.
    expect(sidebarSource).toMatch(
      /import \{ NEW_TEMPLATE_ACTION_LABEL \} from ['"]@\/features\/templates\/labels['"]/,
    );
    expect(sidebarSource).toMatch(/\{NEW_TEMPLATE_ACTION_LABEL\}/);
  });

  it('HR4 (Phase 4.7.4): the canonical label is exactly "New Template"', () => {
    expect(labelsSource).toMatch(/NEW_TEMPLATE_ACTION_LABEL = 'New Template'/);
  });

  it('HR4 (Phase 4.7.4): retired wording does not return in the sidebar', () => {
    // The previous label was "Create from template". It must not be a
    // hand-written literal anywhere in the sidebar source any more.
    expect(sidebarSource).not.toMatch(/Create from template/);
    // The even older "New from template" label is also gone.
    expect(sidebarSource).not.toMatch(/New from template/);
  });
});
