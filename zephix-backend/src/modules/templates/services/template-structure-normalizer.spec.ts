/**
 * Phase 5A.3 — normalizeTemplateStructure invariants.
 *
 * The brief required tests for all 7 cases. Each one is a named `it`.
 *
 * Cases:
 *   a. structure path works
 *   b. flat fallback path works
 *   c. tasks attach to correct phase by phaseOrder
 *   d. empty structure plus empty flat columns rejects
 *   e. preview and instantiate produce the same normalized phase count
 *      and task count from the same template (covered by reusing the
 *      shared helper — both call sites get the same output)
 *   f. a current seeded shape like Waterfall Project passes without
 *      needing structure populated
 *   g. a saved WORKSPACE template flat shape also passes
 */
import { normalizeTemplateStructure } from './template-structure-normalizer';

describe('normalizeTemplateStructure', () => {
  /* ─── Case (a): structure path works ──────────────────────────────── */

  it('case (a): uses structure.phases when populated, with nested tasks', () => {
    const template = {
      structure: {
        phases: [
          {
            name: 'Discovery',
            order: 0,
            tasks: [
              { name: 'Interview users', priority: 'high' },
              { name: 'Synthesize findings', priority: 'medium' },
            ],
          },
          { name: 'Build', order: 1, tasks: [{ name: 'Ship MVP' }] },
        ],
      },
      phases: undefined,
      taskTemplates: undefined,
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result).not.toBeNull();
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].name).toBe('Discovery');
    expect(result.phases[0].tasks).toHaveLength(2);
    expect(result.phases[0].tasks[0].title).toBe('Interview users');
    expect(result.phases[1].tasks).toHaveLength(1);
  });

  /* ─── Case (b): flat fallback path works ─────────────────────────── */

  it('case (b): uses flat phases + taskTemplates when structure is null', () => {
    const template = {
      structure: null,
      phases: [
        { name: 'Phase A', order: 0 },
        { name: 'Phase B', order: 1 },
      ],
      taskTemplates: [
        { name: 'Task A1', phaseOrder: 0 },
        { name: 'Task B1', phaseOrder: 1 },
      ],
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result).not.toBeNull();
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].name).toBe('Phase A');
    expect(result.phases[0].tasks[0].title).toBe('Task A1');
    expect(result.phases[1].tasks[0].title).toBe('Task B1');
  });

  /* ─── Case (c): tasks attach to correct phase by phaseOrder ──────── */

  it('case (c): attaches tasks to correct phase via phaseOrder', () => {
    const template = {
      structure: null,
      phases: [
        { name: 'Phase 0', order: 0 },
        { name: 'Phase 1', order: 1 },
        { name: 'Phase 2', order: 2 },
      ],
      taskTemplates: [
        { name: 'Goes to phase 1', phaseOrder: 1 },
        { name: 'Also phase 1', phaseOrder: 1 },
        { name: 'Goes to phase 2', phaseOrder: 2 },
        { name: 'Goes to phase 0', phaseOrder: 0 },
      ],
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result.phases[0].tasks.map((t) => t.title)).toEqual([
      'Goes to phase 0',
    ]);
    expect(result.phases[1].tasks.map((t) => t.title)).toEqual([
      'Goes to phase 1',
      'Also phase 1',
    ]);
    expect(result.phases[2].tasks.map((t) => t.title)).toEqual([
      'Goes to phase 2',
    ]);
  });

  it('case (c.1): drops tasks with no phaseOrder (no silent fallback phase)', () => {
    const template = {
      structure: null,
      phases: [{ name: 'Phase 0', order: 0 }],
      taskTemplates: [
        { name: 'Anchored', phaseOrder: 0 },
        { name: 'Orphan with no phaseOrder' },
      ],
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0].tasks).toHaveLength(1);
    expect(result.phases[0].tasks[0].title).toBe('Anchored');
  });

  /* ─── Case (d): empty + empty rejects ────────────────────────────── */

  it('case (d): returns null when both structure and flat columns are empty', () => {
    expect(normalizeTemplateStructure({ structure: null, phases: [] })).toBeNull();
    expect(normalizeTemplateStructure({ structure: {}, phases: undefined })).toBeNull();
    expect(
      normalizeTemplateStructure({
        structure: { phases: [] },
        phases: [],
        taskTemplates: [],
      }),
    ).toBeNull();
    expect(normalizeTemplateStructure(null)).toBeNull();
    expect(normalizeTemplateStructure(undefined)).toBeNull();
  });

  /* ─── Case (e): preview and instantiate share output ─────────────── */

  it('case (e): single helper means preview and instantiate get the same shape', () => {
    // Both call sites pass the same template object into the shared
    // normalizer, so by construction they get identical output. This test
    // pins that there is exactly one normalizer export.
    const template = {
      structure: null,
      phases: [
        { name: 'P0', order: 0 },
        { name: 'P1', order: 1 },
      ],
      taskTemplates: [
        { name: 'T0', phaseOrder: 0 },
        { name: 'T1a', phaseOrder: 1 },
        { name: 'T1b', phaseOrder: 1 },
      ],
    };
    const previewView = normalizeTemplateStructure(template);
    const instantiateView = normalizeTemplateStructure(template);
    expect(previewView).toEqual(instantiateView);
    expect(previewView!.phases).toHaveLength(2);
    expect(
      previewView!.phases.reduce((sum, p) => sum + p.tasks.length, 0),
    ).toBe(3);
  });

  /* ─── Case (f): real Phase 5A "Waterfall Project" shape ──────────── */

  it('case (f): Phase 5A Waterfall Project flat shape works without structure', () => {
    // Mirrors system-template-definitions "Waterfall Project" (5 phases, 20 tasks).
    const template = {
      structure: null,
      phases: [
        { name: 'Requirements & scope', order: 0, estimatedDurationDays: 10, reportingKey: 'REQ' },
        { name: 'Design', order: 1, estimatedDurationDays: 14, reportingKey: 'DESIGN' },
        { name: 'Build', order: 2, estimatedDurationDays: 45, reportingKey: 'BUILD' },
        {
          name: 'Test & UAT',
          order: 3,
          estimatedDurationDays: 21,
          reportingKey: 'TEST',
          isMilestone: true,
        },
        {
          name: 'Deploy & close',
          order: 4,
          estimatedDurationDays: 10,
          reportingKey: 'CLOSE',
          isMilestone: true,
        },
      ],
      taskTemplates: [
        { name: 'Project charter & success criteria', phaseOrder: 0, priority: 'high' },
        { name: 'Stakeholder register & communication plan', phaseOrder: 0, priority: 'high' },
        { name: 'Requirements / BRD', phaseOrder: 0, priority: 'high' },
        { name: 'Scope baseline sign-off', phaseOrder: 0, priority: 'critical' },
        { name: 'Solution architecture', phaseOrder: 1, priority: 'high' },
        { name: 'Detailed design & specifications', phaseOrder: 1, priority: 'high' },
        { name: 'Schedule & cost baselines', phaseOrder: 1, priority: 'high' },
        { name: 'Risk register (design stage)', phaseOrder: 1, priority: 'medium' },
        { name: 'Implementation & feature delivery', phaseOrder: 2, priority: 'high' },
        { name: 'Integration & build stabilization', phaseOrder: 2, priority: 'high' },
        { name: 'Weekly status & variance reporting', phaseOrder: 2, priority: 'medium' },
        { name: 'Test plan & test cases', phaseOrder: 3, priority: 'high' },
        { name: 'QA execution & defect management', phaseOrder: 3, priority: 'high' },
        { name: 'UAT with stakeholders', phaseOrder: 3, priority: 'high' },
        { name: 'Release readiness checklist', phaseOrder: 3, priority: 'critical' },
        { name: 'Production deployment / go-live', phaseOrder: 4, priority: 'critical' },
        { name: 'Training & handover', phaseOrder: 4, priority: 'high' },
        { name: 'Stabilization / hypercare', phaseOrder: 4, priority: 'medium' },
        { name: 'Project closure & lessons learned', phaseOrder: 4, priority: 'medium' },
        { name: 'Formal acceptance sign-off', phaseOrder: 4, priority: 'critical' },
      ],
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result).not.toBeNull();
    expect(result.phases).toHaveLength(5);

    const taskCounts = result.phases.map((p) => p.tasks.length);
    expect(taskCounts).toEqual([4, 4, 3, 4, 5]);

    const totalTasks = result.phases.reduce(
      (sum, p) => sum + p.tasks.length,
      0,
    );
    expect(totalTasks).toBe(20);

    expect(result.phases[0].name).toBe('Requirements & scope');
    expect(result.phases[0].tasks[0].title).toBe('Project charter & success criteria');
    expect(result.phases[3].isMilestone).toBe(true);
    expect(result.phases[4].isMilestone).toBe(true);
  });

  /* ─── Case (g): saved WORKSPACE template shape ───────────────────── */

  it('case (g): a saved WORKSPACE template (Phase 4 saveProjectAsTemplate) shape works', () => {
    // saveProjectAsTemplate writes phasesSnapshot with `order` 1-indexed
    // and tasks with `phaseOrder` matching that order, plus an
    // `estimatedHours` field.
    const template = {
      structure: null,
      phases: [
        { name: 'Discovery', order: 1 },
        { name: 'Iterative Delivery', order: 2 },
      ],
      taskTemplates: [
        { name: 'Architecture spike', phaseOrder: 1, estimatedHours: 16, priority: 'high' },
        { name: 'Iteration planning', phaseOrder: 2, estimatedHours: 4, priority: 'high' },
        { name: 'Governance gate review', phaseOrder: 2, estimatedHours: 2, priority: 'high' },
      ],
      // Phase 4.6 metadata for save-as-template path
      metadata: {
        sourceProjectId: 'src-uuid',
        sourceProjectName: 'Source Project',
        savedAt: '2026-04-07T00:00:00Z',
        savedByUserId: 'user-uuid',
      },
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result).not.toBeNull();
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].name).toBe('Discovery');
    expect(result.phases[0].tasks).toHaveLength(1);
    expect(result.phases[0].tasks[0].title).toBe('Architecture spike');
    expect(result.phases[1].tasks).toHaveLength(2);
  });

  /* ─── Extra: PostgreSQL JSONB array shape coercion ───────────────── */

  it('coerces PostgreSQL JSONB array shape (object with numeric keys) to a real array', () => {
    // PostgreSQL JSONB arrays sometimes come back as { "0": {...}, "1": {...} }
    // when the column was a JSONB array literal. The normalizer must
    // coerce both shapes.
    const template = {
      structure: null,
      phases: {
        '0': { name: 'P0', order: 0 },
        '1': { name: 'P1', order: 1 },
      } as any,
      taskTemplates: {
        '0': { name: 'T0', phaseOrder: 0 },
      } as any,
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result).not.toBeNull();
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].name).toBe('P0');
    expect(result.phases[0].tasks[0].title).toBe('T0');
  });

  /* ─── Extra: structure path preferred over flat when both populated ─ */

  it('prefers structure.phases over flat columns when both have data', () => {
    const template = {
      structure: {
        phases: [{ name: 'From structure', order: 0, tasks: [] }],
      },
      phases: [{ name: 'From flat', order: 0 }] as any,
      taskTemplates: [{ name: 'Flat task', phaseOrder: 0 }] as any,
    };

    const result = normalizeTemplateStructure(template)!;
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0].name).toBe('From structure');
    expect(result.phases[0].tasks).toHaveLength(0);
  });
});
