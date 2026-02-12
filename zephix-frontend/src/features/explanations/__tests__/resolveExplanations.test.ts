// ─────────────────────────────────────────────────────────────────────────────
// resolveExecutionExplanations — Step 20.5
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { resolveExecutionExplanations } from '../resolveExplanations';
import type { ExplanationContext } from '../types';

describe('resolveExecutionExplanations', () => {
  // ─── Empty / no context ────────────────────────────────────────────────

  it('returns empty array for empty context', () => {
    expect(resolveExecutionExplanations({})).toEqual([]);
  });

  it('returns empty array when all fields are normal', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      },
      schedule: { status: 'ON_TRACK' },
    };
    expect(resolveExecutionExplanations(ctx)).toEqual([]);
  });

  // ─── Blocked by policy (explicit reason) ───────────────────────────────

  it('explains task blocked by explicit reason', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'BLOCKED',
        blockedReason: 'Waiting for vendor approval',
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task-blocked-reason');
    expect(result[0].severity).toBe('block');
    expect(result[0].explanation).toBe('Waiting for vendor approval');
  });

  // ─── Blocked by dependency ─────────────────────────────────────────────

  it('explains task blocked by dependencies', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'TODO',
        isBlockedByDependencies: true,
        blockingTaskCount: 3,
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.some((e) => e.id === 'task-blocked-dependency')).toBe(true);
    const dep = result.find((e) => e.id === 'task-blocked-dependency')!;
    expect(dep.severity).toBe('block');
    expect(dep.explanation).toContain('3 upstream tasks');
    expect(dep.suggestedActions).toHaveLength(1);
    expect(dep.suggestedActions[0].actionId).toBe('OPEN_PROJECT_BOARD');
  });

  it('uses singular form for 1 blocking task', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'TODO',
        isBlockedByDependencies: true,
        blockingTaskCount: 1,
      },
    };
    const dep = resolveExecutionExplanations(ctx).find(
      (e) => e.id === 'task-blocked-dependency',
    )!;
    expect(dep.explanation).toContain('1 upstream task has');
  });

  // ─── Delayed by schedule ───────────────────────────────────────────────

  it('explains delayed schedule', () => {
    const ctx: ExplanationContext = {
      schedule: {
        status: 'DELAYED',
        endVarianceDays: -10,
        forecastEndDate: '2026-03-15',
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.some((e) => e.id === 'schedule-delayed')).toBe(true);
    const delayed = result.find((e) => e.id === 'schedule-delayed')!;
    expect(delayed.severity).toBe('warn');
    expect(delayed.explanation).toContain('10-day delay');
    expect(delayed.explanation).toContain('2026-03-15');
    expect(delayed.suggestedActions[0].actionId).toBe('OPEN_PROJECT_GANTT');
  });

  it('explains at-risk schedule', () => {
    const ctx: ExplanationContext = {
      schedule: { status: 'AT_RISK' },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.some((e) => e.id === 'schedule-at-risk')).toBe(true);
    expect(result.find((e) => e.id === 'schedule-at-risk')!.severity).toBe('warn');
  });

  // ─── At risk due to resource overload ──────────────────────────────────

  it('explains over-allocated resource', () => {
    const ctx: ExplanationContext = {
      resource: {
        isOverAllocated: true,
        totalAllocationPercent: 145,
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.some((e) => e.id === 'resource-overallocated')).toBe(true);
    const res = result.find((e) => e.id === 'resource-overallocated')!;
    expect(res.severity).toBe('warn');
    expect(res.explanation).toContain('145%');
  });

  it('explains resource risk drivers', () => {
    const ctx: ExplanationContext = {
      resource: {
        riskDrivers: ['Competing project deadlines', 'Low availability this week'],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    const risk = result.find((e) => e.id === 'resource-risk-drivers')!;
    expect(risk).toBeDefined();
    expect(risk.severity).toBe('info');
    expect(risk.explanation).toContain('Competing project deadlines');
  });

  // ─── Gate blocked (hard) ───────────────────────────────────────────────

  it('explains hard gate block', () => {
    const ctx: ExplanationContext = {
      gate: {
        blocked: true,
        enforcementMode: 'HARD',
        warnings: [],
        requiredActions: [],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    const gate = result.find((e) => e.id === 'gate-hard-block')!;
    expect(gate).toBeDefined();
    expect(gate.severity).toBe('block');
    expect(gate.suggestedActions).toHaveLength(2);
    expect(gate.suggestedActions[0].actionId).toBe('OPEN_PHASE_GATE_PANEL');
    expect(gate.suggestedActions[1].actionId).toBe('CREATE_PHASE_GATE_SUBMISSION');
  });

  // ─── Gate blocked (soft) ───────────────────────────────────────────────

  it('explains soft gate warning', () => {
    const ctx: ExplanationContext = {
      gate: {
        blocked: true,
        enforcementMode: 'SOFT',
        warnings: [],
        requiredActions: [],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    const gate = result.find((e) => e.id === 'gate-soft-warn')!;
    expect(gate).toBeDefined();
    expect(gate.severity).toBe('warn');
    expect(gate.explanation).toContain('advisory mode');
  });

  // ─── Governance disabled (no explanations) ─────────────────────────────

  it('shows no policy explanations when governance is disabled', () => {
    const ctx: ExplanationContext = {
      policies: {
        governanceEnabled: false,
        appliedPolicies: [
          { key: 'some.policy', resolvedValue: true, source: 'ORG' },
        ],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.some((e) => e.id === 'policies-active')).toBe(false);
  });

  it('shows policy explanation when governance is enabled', () => {
    const ctx: ExplanationContext = {
      policies: {
        governanceEnabled: true,
        appliedPolicies: [
          { key: 'phase.gate.enforcement', resolvedValue: 'HARD', source: 'WORKSPACE' },
        ],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    const pol = result.find((e) => e.id === 'policies-active')!;
    expect(pol).toBeDefined();
    expect(pol.severity).toBe('info');
    expect(pol.explanation).toContain('WORKSPACE');
    expect(pol.suggestedActions[0].actionId).toBe('OPEN_POLICIES_WORKSPACE');
  });

  // ─── Phase locked ──────────────────────────────────────────────────────

  it('explains locked phase', () => {
    const ctx: ExplanationContext = {
      phase: { id: 'p-1', isLocked: true },
    };
    const result = resolveExecutionExplanations(ctx);
    const locked = result.find((e) => e.id === 'phase-locked')!;
    expect(locked).toBeDefined();
    expect(locked.severity).toBe('block');
  });

  // ─── Task overdue ──────────────────────────────────────────────────────

  it('explains overdue task', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
      },
    };
    const result = resolveExecutionExplanations(ctx);
    const overdue = result.find((e) => e.id === 'task-overdue')!;
    expect(overdue).toBeDefined();
    expect(overdue.severity).toBe('warn');
    expect(overdue.explanation).toContain('3 days ago');
  });

  it('does not flag completed tasks as overdue', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'DONE',
        dueDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        completedAt: new Date().toISOString(),
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.some((e) => e.id === 'task-overdue')).toBe(false);
  });

  // ─── Ordering: block > warn > info ─────────────────────────────────────

  it('sorts explanations by severity: block > warn > info', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'BLOCKED',
        blockedReason: 'External',
        isBlockedByDependencies: true,
        blockingTaskCount: 2,
      },
      schedule: { status: 'AT_RISK' },
      resource: {
        riskDrivers: ['Some driver'],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    expect(result.length).toBeGreaterThanOrEqual(3);
    // First items should be 'block' severity
    const severities = result.map((e) => e.severity);
    expect(severities[0]).toBe('block');
    // Info should be last
    expect(severities[severities.length - 1]).toBe('info');
  });

  // ─── Combined scenario ─────────────────────────────────────────────────

  it('handles multiple conditions simultaneously', () => {
    const ctx: ExplanationContext = {
      task: {
        id: 't-1',
        status: 'BLOCKED',
        blockedReason: 'Pending review',
      },
      schedule: { status: 'DELAYED', endVarianceDays: -5 },
      resource: { isOverAllocated: true, totalAllocationPercent: 130 },
      gate: {
        blocked: true,
        enforcementMode: 'HARD',
        warnings: [{ code: 'DOCS', message: 'Missing deliverables' }],
        requiredActions: [],
      },
    };
    const result = resolveExecutionExplanations(ctx);
    // Should have: task-blocked-reason, gate-hard-block, schedule-delayed, resource-overallocated, gate-warning-DOCS
    expect(result.length).toBeGreaterThanOrEqual(4);
    const ids = result.map((e) => e.id);
    expect(ids).toContain('task-blocked-reason');
    expect(ids).toContain('gate-hard-block');
    expect(ids).toContain('schedule-delayed');
    expect(ids).toContain('resource-overallocated');
  });
});
