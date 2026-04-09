/**
 * Phase 4.6 (Template Center cleanup) — invariants
 *
 * Static-source invariants for the five locked Phase 4.6 items:
 *  1. Shared TemplateOriginMetadata type exists, mirrored backend ↔ frontend
 *  2. SaveAsTemplateModal dispatches the templates-invalidate event
 *  3. TemplateCenterModal listens for that event and refetches
 *  4. TemplatePreviewModal renders human-readable createdByDisplayName,
 *     never a UUID prefix
 *  5. Origin metadata is read through the type guard, not raw any access
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const BACKEND_TYPE = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'zephix-backend',
  'src',
  'modules',
  'templates',
  'dto',
  'template-origin-metadata.ts',
);
const FRONTEND_TYPE = join(__dirname, '..', 'template-origin.ts');
const SAVE_MODAL = join(
  __dirname,
  '..',
  '..',
  'projects',
  'components',
  'SaveAsTemplateModal.tsx',
);
const CENTER_MODAL = join(__dirname, '..', 'components', 'TemplateCenterModal.tsx');
const PREVIEW_MODAL = join(__dirname, '..', 'components', 'TemplatePreviewModal.tsx');

describe('Phase 4.6 — shared TemplateOriginMetadata type', () => {
  const backend = readFileSync(BACKEND_TYPE, 'utf8');
  const frontend = readFileSync(FRONTEND_TYPE, 'utf8');

  it('declares the same minimum field set on both sides', () => {
    for (const field of [
      'sourceProjectId',
      'sourceProjectName',
      'savedAt',
      'savedByUserId',
      'methodologyConfig',
      'activeKpiIds',
    ]) {
      expect(backend).toMatch(new RegExp(`\\b${field}\\b`));
      expect(frontend).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it('exposes a type guard on both sides', () => {
    expect(backend).toMatch(/isTemplateOriginMetadata/);
    expect(frontend).toMatch(/isTemplateOriginMetadata/);
  });
});

describe('Phase 4.6 — Template Center refresh after save', () => {
  const saveModal = readFileSync(SAVE_MODAL, 'utf8');
  const centerModal = readFileSync(CENTER_MODAL, 'utf8');

  it('SaveAsTemplateModal dispatches templates-invalidate event on success', () => {
    expect(saveModal).toMatch(/zephix:templates:invalidate/);
    expect(saveModal).toMatch(/dispatchEvent\(new CustomEvent/);
  });

  it('TemplateCenterModal listens for templates-invalidate and refetches', () => {
    expect(centerModal).toMatch(
      /addEventListener\(['"]zephix:templates:invalidate['"]/,
    );
    expect(centerModal).toMatch(/fetchTemplatesRef/);
  });
});

describe('Phase 4.6 — human-readable creator attribution', () => {
  const previewModal = readFileSync(PREVIEW_MODAL, 'utf8');

  it('preview renders createdByDisplayName, never a UUID prefix', () => {
    expect(previewModal).toMatch(/createdByDisplayName/);
    // Phase 4 used `createdById.slice(0, 8)` to fake a name. Must be gone.
    expect(previewModal).not.toMatch(/createdById\.slice\(0,\s*8\)/);
  });

  it('preview reads origin metadata via the type guard, not raw any access', () => {
    expect(previewModal).toMatch(/isTemplateOriginMetadata/);
    // Old shape: `template.metadata?.sourceProjectName` direct any-access
    expect(previewModal).not.toMatch(/template\.metadata\?\.sourceProjectName/);
  });
});
