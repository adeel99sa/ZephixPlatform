/**
 * Phase 5A — system template definitions invariants.
 *
 * These are unit-level guards on the data file itself. They prove that
 * the seeded set matches the locked Phase 5A spec without requiring a
 * running database.
 */
import {
  SYSTEM_TEMPLATE_DEFS,
  ACTIVE_TEMPLATE_CODES,
  isTemplateComingSoon,
  type ProjectTemplateCategory,
} from './system-template-definitions';

const PHASE_5A_CATEGORIES: ProjectTemplateCategory[] = [
  'Project Management',
  'Product Management',
  'Software Development',
  'Operations',
  'Startups',
];

describe('Phase 5A — system template definitions', () => {
  it('declares 15 system templates (Phase 5A 14 + Phase 5B.1 pm_waterfall_v2)', () => {
    expect(SYSTEM_TEMPLATE_DEFS).toHaveLength(15);
  });

  it('every template carries category, purpose, methodology, phases, and taskTemplates', () => {
    for (const def of SYSTEM_TEMPLATE_DEFS) {
      expect(def.category).toBeTruthy();
      expect(def.purpose && def.purpose.length).toBeGreaterThan(0);
      expect(def.methodology).toBeTruthy();
      expect(Array.isArray(def.phases)).toBe(true);
      expect(def.phases.length).toBeGreaterThan(0);
      expect(Array.isArray(def.taskTemplates)).toBe(true);
      expect(def.taskTemplates.length).toBeGreaterThan(0);
    }
  });

  it('every template category is one of the 5 locked Phase 5A buckets', () => {
    for (const def of SYSTEM_TEMPLATE_DEFS) {
      expect(PHASE_5A_CATEGORIES).toContain(def.category);
    }
  });

  it('matches the post-5B.1 category counts: PM=5 (extra Waterfall v2), Product=3, SW=3, Ops=2, Startups=2', () => {
    const counts: Record<ProjectTemplateCategory, number> = {
      'Project Management': 0,
      'Product Management': 0,
      'Software Development': 0,
      Operations: 0,
      Startups: 0,
    };
    for (const def of SYSTEM_TEMPLATE_DEFS) counts[def.category]++;
    expect(counts).toEqual({
      'Project Management': 5,
      'Product Management': 3,
      'Software Development': 3,
      Operations: 2,
      Startups: 2,
    });
  });

  it('contains the exact 15 template codes (Phase 5A 14 + pm_waterfall_v2)', () => {
    const codes = SYSTEM_TEMPLATE_DEFS.map((d) => d.code).sort();
    expect(codes).toContain('pm_waterfall_v1');
    expect(codes).toContain('pm_waterfall_v2');
    expect(codes).toHaveLength(15);
  });

  it('Agile Project is one coherent template (single project) with internal sprint structure', () => {
    const agile = SYSTEM_TEMPLATE_DEFS.find((d) => d.name === 'Agile Project');
    expect(agile).toBeDefined();
    expect(agile!.methodology).toBe('agile');
    // Phase 5A rule: "Agile is still one coherent project template with an
    // internal structure that supports backlog, sprint planning, execution,
    // review, and retrospective." Not fragmented across multiple top-level
    // templates.
    const phaseNames = agile!.phases.map((p) => p.name.toLowerCase()).join(' | ');
    expect(phaseNames).toMatch(/backlog|sprint planning/);
    expect(phaseNames).toMatch(/execution/);
    expect(phaseNames).toMatch(/review|retro/);
  });

  it('Phase 5A differentiation: at least three templates differ in real phase + task structure', () => {
    // Waterfall Project (5 phases, 20 tasks, waterfall)
    // Agile Project (3 phases, 6 tasks, agile)
    // Risk Register Project (1 phase, 3 tasks, kanban)
    const waterfall = SYSTEM_TEMPLATE_DEFS.find((d) => d.name === 'Waterfall Project')!;
    const agile = SYSTEM_TEMPLATE_DEFS.find((d) => d.name === 'Agile Project')!;
    const risk = SYSTEM_TEMPLATE_DEFS.find((d) => d.name === 'Risk Register Project')!;

    expect(waterfall.phases.length).not.toEqual(agile.phases.length);
    expect(agile.phases.length).not.toEqual(risk.phases.length);
    expect(waterfall.methodology).not.toEqual(agile.methodology);
    expect(agile.methodology).not.toEqual(risk.methodology);
    // Distinct first-phase names — proves the structures are not just renamed
    expect(waterfall.phases[0].name).not.toEqual(agile.phases[0].name);
    expect(agile.phases[0].name).not.toEqual(risk.phases[0].name);
  });

  it('every template code is unique', () => {
    const codes = SYSTEM_TEMPLATE_DEFS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  // ── Phase 5B.1 / 5B.1A invariants ──────────────────────────────────
  describe('Phase 5B.1 — pm_waterfall_v2 reference template', () => {
    const v2 = SYSTEM_TEMPLATE_DEFS.find((d) => d.code === 'pm_waterfall_v2');

    it('exists', () => {
      expect(v2).toBeDefined();
    });

    it('uses the locked PMI process-group row groups in canonical order', () => {
      expect(v2!.phases.map((p) => p.name)).toEqual([
        'Initiation',
        'Planning',
        'Execution',
        'Monitoring and Control',
        'Closure',
      ]);
    });

    /**
     * Phase 1 (2026-04-08) — replaces the original Phase 5B.1 11-column lock.
     * The new render ships 8 default columns; the 5 dropped from defaults
     * (priority, milestone, dependency, approvalStatus, documentRequired)
     * remain in the data model and are surfaced via `hiddenColumns` so they
     * can be opted in via the column picker.
     */
    it('declares the locked 8 default columns in locked order (Phase 1)', () => {
      expect(v2!.defaultColumns).toEqual([
        'title',
        'assignee',
        'status',
        'startDate',
        'dueDate',
        'completion',
        'duration',
        'remarks',
      ]);
    });

    it('declares the hidden-but-included column pool (Phase 1)', () => {
      expect(v2!.hiddenColumns).toEqual([
        'priority',
        'milestone',
        'dependency',
        'approvalStatus',
        'documentRequired',
        'description',
        'tags',
        'dateCreated',
        'dateDone',
      ]);
    });

    it('declares a phase color palette keyed by reportingKey (Phase 1)', () => {
      expect(v2!.phaseColors).toEqual({
        INIT: '#8b5cf6',
        PLAN: '#06b6d4',
        EXEC: '#10b981',
        MONITOR: '#f59e0b',
        CLOSE: '#ef4444',
      });
    });

    it('declares an explicit status→bucket assignment (Phase 1)', () => {
      expect(v2!.statusBuckets).toEqual({
        not_started: ['BACKLOG', 'TODO'],
        active: ['IN_PROGRESS', 'BLOCKED', 'IN_REVIEW'],
        closed: ['DONE', 'CANCELED'],
      });
    });

    it('every phase has a color in the palette (Phase 1)', () => {
      const palette = v2!.phaseColors!;
      for (const phase of v2!.phases) {
        expect(phase.reportingKey).toBeDefined();
        expect(palette[phase.reportingKey!]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('declares the locked governance options list (display only — not active rules)', () => {
      expect(v2!.governanceOptions).toEqual([
        'Require project manager',
        'Require start and target dates',
        'Require owner on every row',
        'Require document before milestone completion',
        'Require approval before milestone completion',
        'Require dependency closure before completion',
        'Require weekly status update',
        'Lock structure after work starts',
      ]);
    });

    it('Closure phase is a milestone gate', () => {
      const closure = v2!.phases.find((p) => p.name === 'Closure');
      expect(closure?.isMilestone).toBe(true);
    });

    it('declares required artifacts and a "best for" line for the preview', () => {
      expect(Array.isArray(v2!.requiredArtifacts)).toBe(true);
      expect((v2!.requiredArtifacts ?? []).length).toBeGreaterThan(0);
      expect(v2!.bestFor).toBeTruthy();
    });

    it('legacy pm_waterfall_v1 is left untouched (no silent mutation)', () => {
      const v1 = SYSTEM_TEMPLATE_DEFS.find((d) => d.code === 'pm_waterfall_v1');
      expect(v1).toBeDefined();
      expect(v1!.phases.map((p) => p.name)).toEqual([
        'Requirements & scope',
        'Design',
        'Build',
        'Test & UAT',
        'Deploy & close',
      ]);
    });
  });

  describe('Phase 5B.1 — coming-soon registry', () => {
    it('marks pm_waterfall_v2 as the only active template', () => {
      expect(ACTIVE_TEMPLATE_CODES.has('pm_waterfall_v2')).toBe(true);
      expect(ACTIVE_TEMPLATE_CODES.size).toBe(1);
    });

    it('every other system template is coming-soon', () => {
      for (const def of SYSTEM_TEMPLATE_DEFS) {
        if (def.code === 'pm_waterfall_v2') continue;
        expect(isTemplateComingSoon(def.code)).toBe(true);
      }
    });
  });
});
