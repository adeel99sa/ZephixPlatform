/**
 * Phase 5A — Template Center IA + card frame + blueprint invariants.
 *
 * Static-source invariants for the locked Phase 5A rules:
 *
 *  Categories
 *    1. PROJECT_TEMPLATE_CATEGORIES exports the 5 fixed labels in order
 *    2. The constant matches the backend ProjectTemplateCategory union
 *
 *  IA reset (TemplateCenterModal)
 *    3. Left rail renders Categories as the PRIMARY section
 *    4. Source filters render only when their result set is non-empty
 *    5. Modal lands on the first non-empty category by default
 *    6. groupByCategory uses real category field only — no methodology fallback
 *
 *  Card frame
 *    7. Card has methodology badge + complexity badge + structure summary
 *    8. Complexity is derived from real backend phase + task counts
 *    9. Card uses TemplateBlueprint as the thumbnail (no external image)
 *
 *  Blueprint
 *   10. TemplateBlueprint exports four shape branches keyed by methodology
 *   11. TemplatePreviewModal is summary-first (Phase 5A.5 — no blueprint hero)
 *
 *  Truthfulness (carry forward from Phase 1)
 *   12. No hardcoded BuiltInTemplate / CATEGORIES placeholder remains
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const CATEGORIES = join(__dirname, '..', 'categories.ts');
const MODAL = join(__dirname, '..', 'components', 'TemplateCenterModal.tsx');
const CARD = MODAL; // card sub-component lives in the same file
const BLUEPRINT = join(__dirname, '..', 'components', 'TemplateBlueprint.tsx');
const PREVIEW = join(__dirname, '..', 'components', 'TemplatePreviewModal.tsx');
const TEMPLATES_API = join(__dirname, '..', 'templates.api.ts');
const ACTIONS_API = join(__dirname, '..', 'api.ts');
const PROJECT_NAME_MODAL = join(
  __dirname,
  '..',
  'components',
  'ProjectNameModal.tsx',
);
const TEMPLATE_PREVIEW_MODAL = join(
  __dirname,
  '..',
  'components',
  'TemplatePreviewModal.tsx',
);
const TEMPLATE_CENTER_MODAL = join(
  __dirname,
  '..',
  'components',
  'TemplateCenterModal.tsx',
);

describe('Phase 5A — categories constant', () => {
  const src = readFileSync(CATEGORIES, 'utf8');

  it('exports the 5 locked labels in the canonical order', () => {
    expect(src).toMatch(
      /PROJECT_TEMPLATE_CATEGORIES\s*=\s*\[\s*'Project Management',\s*'Product Management',\s*'Software Development',\s*'Operations',\s*'Startups',?\s*\]/,
    );
  });

  it('exports a type guard for runtime validation', () => {
    expect(src).toMatch(/export function isProjectTemplateCategory/);
  });
});

describe('Phase 5A — TemplateCenterModal IA', () => {
  const src = readFileSync(MODAL, 'utf8');

  it('left rail renders Categories as the primary section', () => {
    expect(src).toMatch(/data-testid="template-center-categories"/);
    // Categories section appears before sources section in the JSX
    const catIdx = src.indexOf('template-center-categories');
    const srcIdx = src.indexOf('template-center-sources');
    expect(catIdx).toBeGreaterThan(-1);
    if (srcIdx > -1) {
      expect(catIdx).toBeLessThan(srcIdx);
    }
  });

  it('source filters render only when non-empty (visibleSourceViews gate)', () => {
    expect(src).toMatch(/visibleSourceViews/);
    expect(src).toMatch(/sourceViewsCounts\[v\.id\] > 0/);
  });

  it('lands on the first non-empty category by default', () => {
    expect(src).toMatch(/setActiveCategory\(categories\[0\]\)/);
  });

  it('groupByCategory uses real category field only — no methodology fallback', () => {
    // Find the function body and assert no methodologyLabel is called inside
    const fn = src.match(/function groupByCategory[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).not.toMatch(/methodologyLabel\s*\(/);
  });

  it('default category branch only fires when categories.length > 0', () => {
    expect(src).toMatch(/categories\.length > 0/);
  });
});

describe('Phase 5A — TemplateCard frame', () => {
  const src = readFileSync(CARD, 'utf8');

  it('renders methodology badge', () => {
    expect(src).toMatch(/data-testid="template-card-methodology-badge"/);
  });

  it('renders complexity badge', () => {
    expect(src).toMatch(/data-testid="template-card-complexity-badge"/);
  });

  it('renders structure summary (phase + task counts)', () => {
    expect(src).toMatch(/data-testid="template-card-structure-summary"/);
  });

  it('derives complexity from real phase + task counts (no hardcoded levels)', () => {
    expect(src).toMatch(
      /function deriveComplexity[\s\S]*?phases <= 2 && tasks <= 6[\s\S]*?return 'Light'/,
    );
    expect(src).toMatch(/return 'Standard'/);
    expect(src).toMatch(/return 'Advanced'/);
  });

  it('uses TemplateBlueprint as the thumbnail (no <img src= for marketing art)', () => {
    expect(src).toMatch(/<TemplateBlueprint template=\{template\} size="card"/);
    // No external image source for the card thumbnail
    const cardBlock = src.match(/Blueprint thumbnail[\s\S]*?<\/button>/);
    expect(cardBlock).not.toBeNull();
    expect(cardBlock?.[0]).not.toMatch(/<img\s/);
  });
});

describe('Phase 5A — TemplateBlueprint shapes', () => {
  const src = readFileSync(BLUEPRINT, 'utf8');

  it('declares four shape branches keyed by methodology', () => {
    expect(src).toMatch(/m === 'waterfall'/);
    expect(src).toMatch(/m === 'agile' \|\| m === undefined/);
    expect(src).toMatch(/m === 'kanban'/);
    expect(src).toMatch(/m === 'hybrid'/);
  });

  it('renders an svg with role=img and a structural aria-label, not decorative', () => {
    expect(src).toMatch(/role="img"/);
    expect(src).toMatch(/aria-label=\{ariaLabel\}/);
  });

  it('exposes data-methodology for downstream tests / styling', () => {
    expect(src).toMatch(/data-methodology=\{m \?\? 'unspecified'\}/);
  });

  it('uses no external image references at all', () => {
    expect(src).not.toMatch(/<img\b/);
    expect(src).not.toMatch(/url\(['"]http/);
  });
});

describe('Phase 5A.5 — TemplatePreviewModal summary-first (no blueprint hero)', () => {
  const src = readFileSync(PREVIEW, 'utf8');

  it('does not import TemplateBlueprint (retired ClickUp-like hero)', () => {
    expect(src).not.toMatch(/TemplateBlueprint/);
    expect(src).not.toMatch(/template-preview-blueprint/);
  });

  it('uses summary panel test id and structured sections', () => {
    expect(src).toMatch(/data-testid="template-preview-summary"/);
    expect(src).toMatch(/data-testid="template-preview-phases-section"/);
    expect(src).toMatch(/data-testid="template-preview-tabs-section"/);
  });

  it('exposes methodology and complexity badges in the header row', () => {
    expect(src).toMatch(/data-testid="template-preview-methodology-badge"/);
    expect(src).toMatch(/data-testid="template-preview-complexity-badge"/);
  });

  it('Phase 5A.6: summary includes Best for and governance note test ids', () => {
    expect(src).toMatch(/data-testid="template-preview-best-for"/);
    expect(src).toMatch(/data-testid="template-preview-governance-note"/);
  });
});

describe('Phase 5A truth-closure — listTemplates() unwrap fix', () => {
  const src = readFileSync(TEMPLATES_API, 'utf8');

  it('listTemplates uses the canonical request wrapper, not raw api.get', () => {
    // The shared @/lib/api axios instance has a response interceptor that
    // already strips the { data: T } envelope. The previous double-unwrap
    // (`response.data?.data || response.data || []`) silently dropped the
    // entire body and returned [] for every list call. Pin the fix.
    const fn = src.match(/export async function listTemplates[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).toMatch(/request\.get<TemplateDto\[\]>\(['"]\/templates['"]/);
  });

  it('listTemplates does not double-unwrap response.data?.data', () => {
    const fn = src.match(/export async function listTemplates[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    // The bug pattern that returned [] for every list call.
    expect(body).not.toMatch(/response\.data\?\.data/);
    expect(body).not.toMatch(/response\.data \|\| \[\]/);
  });

  it('listTemplates defensively asserts the array shape after unwrap', () => {
    const fn = src.match(/export async function listTemplates[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).toMatch(/Array\.isArray\(result\)/);
  });

  it('templates.api.ts imports the canonical request wrapper from @/lib/api', () => {
    expect(src).toMatch(/import \{ api, request \} from ['"]@\/lib\/api['"]/);
  });
});

describe('Phase 5A.2 truth-closure — getPreview() unwrap fix', () => {
  const src = readFileSync(ACTIONS_API, 'utf8');

  it('getPreview does not double-unwrap response.data?.data', () => {
    // The previous bug pattern returned undefined silently because
    // apiClient.get already strips one data layer.
    const fn = src.match(/export async function getPreview[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).not.toMatch(/response\.data\?\.data/);
    expect(body).not.toMatch(/as unknown as PreviewResponse/);
  });

  it('getPreview returns the apiClient result directly without re-unwrapping', () => {
    const fn = src.match(/export async function getPreview[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).toMatch(/await apiClient\.get<PreviewResponse>/);
    expect(body).toMatch(/return result as PreviewResponse/);
  });
});

describe('Phase 5A.2 truth-closure — instantiateV51() unwrap fix', () => {
  const src = readFileSync(ACTIONS_API, 'utf8');

  it('instantiateV51 does not double-unwrap response.data?.data', () => {
    const fn = src.match(/export async function instantiateV51[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).not.toMatch(/response\.data\?\.data/);
    expect(body).not.toMatch(/as unknown as InstantiateV51Response/);
  });

  it('instantiateV51 returns the apiClient result directly without re-unwrapping', () => {
    const fn = src.match(/export async function instantiateV51[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).toMatch(/await apiClient\.post<InstantiateV51Response>/);
    expect(body).toMatch(/return result as InstantiateV51Response/);
  });
});

describe('Phase 5A.2 truth-closure — child modal stacking', () => {
  const center = readFileSync(TEMPLATE_CENTER_MODAL, 'utf8');
  const nameModal = readFileSync(PROJECT_NAME_MODAL, 'utf8');
  const previewModal = readFileSync(TEMPLATE_PREVIEW_MODAL, 'utf8');

  it('TemplateCenterModal shell is at z-[5001] (the layer the children must overcome)', () => {
    expect(center).toMatch(/z-\[5001\]/);
  });

  it('ProjectNameModal outer is z-[5100] so it paints above the shell', () => {
    // The previous bug was z-50 < z-5001 → modal hidden behind the
    // Template Center shell, so clicks on Use template appeared to do
    // nothing. The fix lifts it above the shell.
    expect(nameModal).toMatch(/fixed inset-0 z-\[5100\]/);
    // The retired z-50 outer must NOT be present.
    expect(nameModal).not.toMatch(/<div className="fixed inset-0 z-50/);
  });

  it('TemplatePreviewModal outer is z-[5100] so it paints above the shell', () => {
    expect(previewModal).toMatch(/fixed inset-0 z-\[5100\]/);
    expect(previewModal).not.toMatch(/<div className="fixed inset-0 z-50/);
  });
});

describe('Phase 5A — truthfulness (carry forward)', () => {
  const src = readFileSync(MODAL, 'utf8');
  it('no hardcoded BuiltInTemplate / CATEGORIES placeholder remains', () => {
    expect(src).not.toMatch(/BuiltInTemplate/);
    expect(src).not.toMatch(/^const CATEGORIES\s*[:=]\s*\[/m);
  });
});
