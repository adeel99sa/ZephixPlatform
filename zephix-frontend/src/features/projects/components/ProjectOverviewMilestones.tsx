/**
 * OV-1 Phase B — milestones strip derived from plan phases (isMilestone).
 */

import React, { useMemo } from 'react';
import { Flag } from 'lucide-react';

import type { ProjectPlan, WorkPhase } from '@/features/work-management/workTasks.api';

export type ProjectOverviewMilestonesProps = {
  plan: ProjectPlan | null;
  planLoadError: string | null;
};

function milestonePhases(plan: ProjectPlan | null): WorkPhase[] {
  if (!plan?.phases?.length) return [];
  return [...plan.phases]
    .filter((p) => p.isMilestone)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ProjectOverviewMilestones({ plan, planLoadError }: ProjectOverviewMilestonesProps) {
  const milestones = useMemo(() => milestonePhases(plan), [plan]);

  if (planLoadError || !plan) return null;
  if (milestones.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400"
        data-testid="overview-milestones-empty"
      >
        No milestones marked on this plan.
      </div>
    );
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      data-testid="overview-milestones-strip"
      aria-label="Project milestones"
    >
      <div className="mb-3 flex items-center gap-2">
        <Flag className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Milestones</h2>
      </div>
      <ul className="flex flex-wrap gap-2">
        {milestones.map((m) => (
          <li
            key={m.id}
            className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-xs dark:border-blue-900 dark:bg-blue-950/30"
            data-testid={`overview-milestone-${m.id}`}
          >
            <span className="font-medium text-blue-900 dark:text-blue-100">{m.name}</span>
            {m.dueDate && (
              <span className="text-blue-700/80 dark:text-blue-300/80">{m.dueDate.slice(0, 10)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
