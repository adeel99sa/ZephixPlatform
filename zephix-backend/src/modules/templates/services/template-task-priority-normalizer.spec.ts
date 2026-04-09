/**
 * Phase 5A.4 — normalizeTemplateTaskPriority invariants.
 *
 * Required brief cases:
 *   1. high maps correctly
 *   2. medium maps correctly
 *   3. low maps correctly
 *   4. critical maps correctly
 *   5. unknown value rejects with a truthful error
 *   6. Waterfall Project flat task template shape passes
 *   7. Agile Project flat task template shape passes
 *
 * Plus invariants for the round-trip via saveProjectAsTemplate.
 */
import {
  normalizeTemplateTaskPriority,
  normalizeTemplateTaskPriorityOrDefault,
} from './template-task-priority-normalizer';
import { TaskPriority } from '../../work-management/enums/task.enums';

describe('normalizeTemplateTaskPriority', () => {
  /* ─── Cases 1-4: lowercase template tokens map to canonical enum ─── */

  it('case 1: "high" maps to TaskPriority.HIGH', () => {
    expect(normalizeTemplateTaskPriority('high')).toBe(TaskPriority.HIGH);
  });

  it('case 2: "medium" maps to TaskPriority.MEDIUM', () => {
    expect(normalizeTemplateTaskPriority('medium')).toBe(TaskPriority.MEDIUM);
  });

  it('case 3: "low" maps to TaskPriority.LOW', () => {
    expect(normalizeTemplateTaskPriority('low')).toBe(TaskPriority.LOW);
  });

  it('case 4: "critical" maps to TaskPriority.CRITICAL', () => {
    expect(normalizeTemplateTaskPriority('critical')).toBe(
      TaskPriority.CRITICAL,
    );
  });

  /* ─── Already-canonical pass-through ─── */

  it('uppercase enum tokens pass through unchanged', () => {
    expect(normalizeTemplateTaskPriority('HIGH')).toBe(TaskPriority.HIGH);
    expect(normalizeTemplateTaskPriority('MEDIUM')).toBe(TaskPriority.MEDIUM);
    expect(normalizeTemplateTaskPriority('LOW')).toBe(TaskPriority.LOW);
    expect(normalizeTemplateTaskPriority('CRITICAL')).toBe(
      TaskPriority.CRITICAL,
    );
  });

  it('mixed case tokens normalize (defensive)', () => {
    expect(normalizeTemplateTaskPriority('High')).toBe(TaskPriority.HIGH);
    expect(normalizeTemplateTaskPriority('cRiTiCaL')).toBe(TaskPriority.CRITICAL);
  });

  it('whitespace-padded tokens normalize', () => {
    expect(normalizeTemplateTaskPriority('  high  ')).toBe(TaskPriority.HIGH);
  });

  /* ─── Empty / null / undefined → null (caller picks default) ─── */

  it('null input returns null (no silent fallback)', () => {
    expect(normalizeTemplateTaskPriority(null)).toBeNull();
  });

  it('undefined input returns null', () => {
    expect(normalizeTemplateTaskPriority(undefined)).toBeNull();
  });

  it('empty string returns null', () => {
    expect(normalizeTemplateTaskPriority('')).toBeNull();
    expect(normalizeTemplateTaskPriority('   ')).toBeNull();
  });

  /* ─── Case 5: unknown value rejects with truthful error ─── */

  it('case 5: unknown value rejects with the bad value embedded in the error', () => {
    expect(() => normalizeTemplateTaskPriority('urgent')).toThrow(
      /Invalid template task priority: "urgent"/,
    );
    expect(() => normalizeTemplateTaskPriority('blocker')).toThrow(
      /Invalid template task priority: "blocker"/,
    );
    expect(() => normalizeTemplateTaskPriority('p0')).toThrow(
      /Accepted values are: LOW, MEDIUM, HIGH, CRITICAL/,
    );
  });

  it('non-string input throws with type info', () => {
    expect(() => normalizeTemplateTaskPriority(42 as any)).toThrow(
      /expected string, got number/,
    );
    expect(() => normalizeTemplateTaskPriority({} as any)).toThrow(
      /expected string, got object/,
    );
  });

  /* ─── Case 6: Waterfall Project flat task template shape ─── */

  it('case 6: Waterfall Project flat tasks all normalize successfully', () => {
    const waterfallTasks = [
      { name: 'Project charter & success criteria', priority: 'high' },
      { name: 'Stakeholder register & communication plan', priority: 'high' },
      { name: 'Requirements / BRD', priority: 'high' },
      { name: 'Scope baseline sign-off', priority: 'critical' },
      { name: 'Solution architecture', priority: 'high' },
      { name: 'Detailed design & specifications', priority: 'high' },
      { name: 'Schedule & cost baselines', priority: 'high' },
      { name: 'Risk register (design stage)', priority: 'medium' },
      { name: 'Implementation & feature delivery', priority: 'high' },
      { name: 'Integration & build stabilization', priority: 'high' },
      { name: 'Weekly status & variance reporting', priority: 'medium' },
      { name: 'Test plan & test cases', priority: 'high' },
      { name: 'QA execution & defect management', priority: 'high' },
      { name: 'UAT with stakeholders', priority: 'high' },
      { name: 'Release readiness checklist', priority: 'critical' },
      { name: 'Production deployment / go-live', priority: 'critical' },
      { name: 'Training & handover', priority: 'high' },
      { name: 'Stabilization / hypercare', priority: 'medium' },
      { name: 'Project closure & lessons learned', priority: 'medium' },
      { name: 'Formal acceptance sign-off', priority: 'critical' },
    ];

    const normalized = waterfallTasks.map((t) =>
      normalizeTemplateTaskPriorityOrDefault(t.priority),
    );

    expect(normalized).toEqual([
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.CRITICAL,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.CRITICAL,
      TaskPriority.CRITICAL,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.MEDIUM,
      TaskPriority.CRITICAL,
    ]);
  });

  /* ─── Case 7: Agile Project flat task template shape ─── */

  it('case 7: Agile Project flat tasks all normalize successfully', () => {
    // Real shape from system-template-definitions.ts Agile Project section
    const agileTasks = [
      { name: 'Refine backlog', priority: 'high' },
      { name: 'Sprint goal', priority: 'high' },
      { name: 'Daily standup cadence', priority: 'medium' },
      { name: 'Development work', priority: 'high' },
      { name: 'Sprint demo', priority: 'medium' },
      { name: 'Retrospective', priority: 'medium' },
    ];

    const normalized = agileTasks.map((t) =>
      normalizeTemplateTaskPriorityOrDefault(t.priority),
    );

    expect(normalized).toEqual([
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.MEDIUM,
    ]);
  });

  /* ─── Round-trip: saveProjectAsTemplate → instantiate ─── */

  it('round-trip: WorkTask uppercase priority → save-as-template → instantiate normalizes back to uppercase', () => {
    // saveProjectAsTemplate sees the source WorkTask with uppercase priority
    const sourceWorkTaskPriority = TaskPriority.HIGH;

    // It captures via the same normalizer (Phase 5A.4 fix in projects.service)
    const savedTemplatePriority = normalizeTemplateTaskPriority(
      sourceWorkTaskPriority,
    );
    expect(savedTemplatePriority).toBe(TaskPriority.HIGH);

    // Later, instantiate reads the saved template task and normalizes again
    const reinstantiatedPriority = normalizeTemplateTaskPriorityOrDefault(
      savedTemplatePriority,
    );
    expect(reinstantiatedPriority).toBe(TaskPriority.HIGH);
  });

  /* ─── normalizeTemplateTaskPriorityOrDefault default ─── */

  it('orDefault returns MEDIUM when input is null/undefined/empty', () => {
    expect(normalizeTemplateTaskPriorityOrDefault(null)).toBe(
      TaskPriority.MEDIUM,
    );
    expect(normalizeTemplateTaskPriorityOrDefault(undefined)).toBe(
      TaskPriority.MEDIUM,
    );
    expect(normalizeTemplateTaskPriorityOrDefault('')).toBe(TaskPriority.MEDIUM);
  });

  it('orDefault still throws on unknown values (does NOT swallow as default)', () => {
    expect(() => normalizeTemplateTaskPriorityOrDefault('urgent')).toThrow(
      /Invalid template task priority/,
    );
  });
});
