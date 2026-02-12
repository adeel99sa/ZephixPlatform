// ─────────────────────────────────────────────────────────────────────────────
// Execution Explanation Resolver — Step 20.2
//
// Pure function. No side effects. No mutations. No network calls.
// Takes execution context, returns human-readable explanations.
// ─────────────────────────────────────────────────────────────────────────────

import { CommandActionId } from '@/features/command-palette/commandPalette.api';
import type { Explanation, ExplanationContext } from './types';

/**
 * Resolve contextual explanations from the current execution state.
 *
 * Rules:
 * - Returns empty array if governance is disabled AND no blocking conditions
 * - Explanations are ordered by severity: block > warn > info
 * - No side effects. Fully deterministic.
 */
export function resolveExecutionExplanations(
  ctx: ExplanationContext,
): Explanation[] {
  const explanations: Explanation[] = [];

  // ─── Task-level explanations ───────────────────────────────────────────

  if (ctx.task) {
    // Blocked by explicit reason
    if (ctx.task.status === 'BLOCKED' && ctx.task.blockedReason) {
      explanations.push({
        id: 'task-blocked-reason',
        severity: 'block',
        title: 'This task is blocked',
        explanation: ctx.task.blockedReason,
        suggestedActions: [],
      });
    }

    // Blocked by dependencies
    if (ctx.task.isBlockedByDependencies) {
      const count = ctx.task.blockingTaskCount ?? 0;
      explanations.push({
        id: 'task-blocked-dependency',
        severity: 'block',
        title: 'Blocked by dependencies',
        explanation: `This task cannot proceed because ${count} upstream ${count === 1 ? 'task has' : 'tasks have'} not been completed yet.`,
        suggestedActions: [
          {
            actionId: CommandActionId.OPEN_PROJECT_BOARD,
            label: 'View board to identify blocking tasks',
          },
        ],
      });
    }

    // Task overdue
    if (
      ctx.task.dueDate &&
      !ctx.task.completedAt &&
      ctx.task.status !== 'DONE' &&
      ctx.task.status !== 'CANCELED' &&
      ctx.task.status !== 'CANCELLED'
    ) {
      const due = new Date(ctx.task.dueDate);
      const now = new Date();
      if (due < now) {
        const daysOverdue = Math.ceil(
          (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
        );
        explanations.push({
          id: 'task-overdue',
          severity: 'warn',
          title: 'Task is overdue',
          explanation: `This task was due ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} ago and has not been completed.`,
          suggestedActions: [],
        });
      }
    }
  }

  // ─── Schedule-level explanations ───────────────────────────────────────

  if (ctx.schedule) {
    if (ctx.schedule.status === 'DELAYED') {
      const days = Math.abs(ctx.schedule.endVarianceDays ?? 0);
      explanations.push({
        id: 'schedule-delayed',
        severity: 'warn',
        title: 'Schedule is delayed',
        explanation: `The current forecast shows a ${days}-day delay from the planned end date.${ctx.schedule.forecastEndDate ? ` Revised forecast: ${ctx.schedule.forecastEndDate}.` : ''}`,
        suggestedActions: [
          {
            actionId: CommandActionId.OPEN_PROJECT_GANTT,
            label: 'View Gantt chart',
          },
        ],
      });
    }

    if (ctx.schedule.status === 'AT_RISK') {
      explanations.push({
        id: 'schedule-at-risk',
        severity: 'warn',
        title: 'Schedule is at risk',
        explanation:
          'The current pace suggests this work may not complete on time. Review the timeline and consider adjustments.',
        suggestedActions: [
          {
            actionId: CommandActionId.OPEN_PROJECT_GANTT,
            label: 'View Gantt chart',
          },
        ],
      });
    }
  }

  // ─── Resource-level explanations ───────────────────────────────────────

  if (ctx.resource) {
    if (ctx.resource.isOverAllocated) {
      const pct = ctx.resource.totalAllocationPercent ?? 0;
      explanations.push({
        id: 'resource-overallocated',
        severity: 'warn',
        title: 'Resource is over-allocated',
        explanation: `The assigned resource is at ${pct}% allocation across all projects, which exceeds the recommended threshold.`,
        suggestedActions: [],
      });
    }

    if (ctx.resource.riskDrivers && ctx.resource.riskDrivers.length > 0) {
      explanations.push({
        id: 'resource-risk-drivers',
        severity: 'info',
        title: 'Resource risk factors detected',
        explanation: ctx.resource.riskDrivers.join('. ') + '.',
        suggestedActions: [],
      });
    }
  }

  // ─── Gate-level explanations ───────────────────────────────────────────

  if (ctx.gate) {
    if (ctx.gate.blocked && ctx.gate.enforcementMode === 'HARD') {
      explanations.push({
        id: 'gate-hard-block',
        severity: 'block',
        title: 'Phase gate is blocking progress',
        explanation:
          'A required phase gate has not been passed. This phase cannot be completed until the gate criteria are met and approved.',
        suggestedActions: [
          {
            actionId: CommandActionId.OPEN_PHASE_GATE_PANEL,
            label: 'Open gate panel',
          },
          {
            actionId: CommandActionId.CREATE_PHASE_GATE_SUBMISSION,
            label: 'Submit for review',
          },
        ],
      });
    }

    if (ctx.gate.blocked && ctx.gate.enforcementMode === 'SOFT') {
      explanations.push({
        id: 'gate-soft-warn',
        severity: 'warn',
        title: 'Phase gate criteria not met',
        explanation:
          'The gate criteria have not been met, but enforcement is set to advisory mode. You may proceed, but the gate status will be recorded.',
        suggestedActions: [
          {
            actionId: CommandActionId.OPEN_PHASE_GATE_PANEL,
            label: 'Review gate criteria',
          },
        ],
      });
    }

    // Gate warnings (from evaluator)
    for (const warning of ctx.gate.warnings ?? []) {
      explanations.push({
        id: `gate-warning-${warning.code}`,
        severity: 'info',
        title: 'Gate review note',
        explanation: warning.message,
        suggestedActions: [],
      });
    }
  }

  // ─── Policy-level explanations ─────────────────────────────────────────

  if (ctx.policies && ctx.policies.governanceEnabled) {
    const applied = ctx.policies.appliedPolicies ?? [];
    if (applied.length > 0) {
      explanations.push({
        id: 'policies-active',
        severity: 'info',
        title: `${applied.length} governance ${applied.length === 1 ? 'policy' : 'policies'} active`,
        explanation: `This work is governed by policies set at the ${applied.map((p) => p.source).filter((v, i, a) => a.indexOf(v) === i).join(' and ')} level.`,
        suggestedActions: [
          {
            actionId: CommandActionId.OPEN_POLICIES_WORKSPACE,
            label: 'View workspace policies',
          },
        ],
      });
    }
  }

  // ─── Phase-level explanations ──────────────────────────────────────────

  if (ctx.phase) {
    if (ctx.phase.isLocked) {
      explanations.push({
        id: 'phase-locked',
        severity: 'block',
        title: 'This phase is locked',
        explanation:
          'No changes can be made to this phase. It may have been locked by an administrator or by a completed gate review.',
        suggestedActions: [],
      });
    }
  }

  // ─── Sort by severity: block > warn > info ─────────────────────────────

  const order: Record<string, number> = { block: 0, warn: 1, info: 2 };
  explanations.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

  return explanations;
}
