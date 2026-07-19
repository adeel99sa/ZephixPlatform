/**
 * OV-1 Phase B/C — Overview phase + gate strip (derived from GET /plan only).
 * CTA deep-links into Plan submission flow when gate.submissionId is present.
 */

import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { ProjectPlan, WorkPhase, WorkPlanPhaseGate } from '@/features/work-management/workTasks.api';
import { PhaseGateHeaderIndicator } from '@/views/work-management/components/PhaseGateHeaderIndicator';

export type ProjectOverviewPhaseGateStripProps = {
  projectId: string;
  plan: ProjectPlan | null;
  planLoadError: string | null;
  onRetryPlan: () => void;
};

/** Plan-side gate UI (PhaseGatePanel mounts on this route via query params). */
export function gatePlanPath(
  projectId: string,
  phaseId: string,
  submissionId?: string | null,
): string {
  const q = new URLSearchParams({ phaseId });
  const sid = submissionId?.trim();
  if (sid) q.set('submissionId', sid);
  return `/work/projects/${projectId}/plan?${q.toString()}`;
}

/** @deprecated Prefer gatePlanPath — kept for existing deep-link call sites. */
export function gateSubmissionPlanPath(
  projectId: string,
  phaseId: string,
  submissionId: string,
): string {
  return gatePlanPath(projectId, phaseId, submissionId);
}

function sortedPhases(plan: ProjectPlan | null): WorkPhase[] {
  if (!plan?.phases?.length) return [];
  return [...plan.phases].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Unsubmitted open gate (definition exists, not yet submitted/approved). Payload has no isBlocking. */
export function isUnsubmittedGate(gate: WorkPlanPhaseGate | null | undefined): boolean {
  if (!gate?.definitionExists) return false;
  const s = gate.submissionStatus;
  return s !== 'APPROVED' && s !== 'SUBMITTED';
}

export function describeGateState(gate: WorkPlanPhaseGate | null | undefined): {
  gated: boolean;
  title: string;
  detail: string | null;
} {
  if (!gate?.definitionExists) {
    return { gated: false, title: 'No gate', detail: null };
  }
  const s = gate.submissionStatus;
  if (s === 'APPROVED') {
    const who =
      gate.decisionByUserId != null
        ? `Decision by ${gate.decisionByUserId.slice(0, 8)}…`
        : null;
    const when = gate.decidedAt ? ` · ${gate.decidedAt.slice(0, 10)}` : '';
    return {
      gated: true,
      title: 'Approved',
      detail: who ? `${who}${when}` : gate.decidedAt ? `Approved ${gate.decidedAt.slice(0, 10)}` : null,
    };
  }
  if (s === 'SUBMITTED') {
    return {
      gated: true,
      title: 'Submitted — awaiting approval',
      detail:
        gate.eligibleApproverLabel?.trim() ||
        'Approver roster is not on the plan payload yet.',
    };
  }
  if (s === 'REJECTED') {
    return {
      gated: true,
      title: 'Rejected',
      detail: 'Needs a new submission before this phase can clear.',
    };
  }
  if (s === 'CANCELLED') {
    return {
      gated: true,
      title: 'Cancelled',
      detail: 'Gate submission was cancelled.',
    };
  }
  // DRAFT or null — not submitted. Do NOT claim "blocking now".
  return {
    gated: true,
    title: 'Gate not submitted',
    detail: null,
  };
}

export function ProjectOverviewPhaseGateStrip({
  projectId,
  plan,
  planLoadError,
  onRetryPlan,
}: ProjectOverviewPhaseGateStripProps) {
  const navigate = useNavigate();
  const phases = useMemo(() => sortedPhases(plan), [plan]);
  const useGates = plan?.capabilities?.use_gates !== false;

  if (planLoadError) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40"
        role="alert"
        data-testid="overview-phase-gate-strip-error"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Phase and gate status unavailable — plan could not be loaded.
          </p>
          <button
            type="button"
            onClick={onRetryPlan}
            className="text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
        data-testid="overview-phase-gate-strip-loading"
      >
        Loading phases…
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
        data-testid="overview-phase-gate-strip-empty"
      >
        No phases on this project yet.
      </div>
    );
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      data-testid="overview-phase-gate-strip"
      aria-label="Project phases and gates"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Phases &amp; gates</h2>
        <Link
          to={`/work/projects/${projectId}/plan`}
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Open Plan
        </Link>
      </div>
      <ol className="divide-y divide-slate-100 dark:divide-slate-700">
        {phases.map((phase, index) => {
          const gate = phase.gate;
          const desc = describeGateState(gate);
          const unsubmitted = isUnsubmittedGate(gate);
          const submissionId = gate?.submissionId?.trim() || '';
          const showCta = unsubmitted && Boolean(submissionId);
          return (
            <li
              key={phase.id}
              className="flex flex-wrap items-start gap-3 px-4 py-3"
              data-testid={`overview-phase-row-${phase.id}`}
              data-sort-order={phase.sortOrder}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {useGates && gate?.definitionExists ? (
                    <PhaseGateHeaderIndicator
                      gate={gate}
                      useGates={useGates}
                      onOpen={() => {
                        navigate(gatePlanPath(projectId, phase.id, gate.submissionId));
                      }}
                    />
                  ) : useGates ? (
                    <PhaseGateHeaderIndicator gate={gate} useGates={useGates} />
                  ) : null}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {phase.name}
                  </span>
                  {phase.isMilestone && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      Milestone
                    </span>
                  )}
                  {desc.gated && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        unsubmitted
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                          : gate?.submissionStatus === 'APPROVED'
                            ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                      data-testid={`overview-phase-gate-label-${phase.id}`}
                    >
                      {desc.title}
                    </span>
                  )}
                  {!desc.gated && useGates && (
                    <span className="text-[11px] text-slate-400">Ungated</span>
                  )}
                </div>
                {desc.detail && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{desc.detail}</p>
                )}
              </div>
              <div
                className="shrink-0"
                data-testid={`overview-phase-gate-cta-slot-${phase.id}`}
                data-submission-id={submissionId}
                data-ready={showCta ? 'true' : 'false'}
              >
                {showCta ? (
                  <Link
                    to={gateSubmissionPlanPath(projectId, phase.id, submissionId)}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    data-testid={`overview-phase-gate-cta-${phase.id}`}
                  >
                    Continue submission
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
