import type { ReactElement } from "react";

import type { GateRecordCycle } from "./gateRecord.types";

import { cn } from "@/lib/utils";

function formatTs(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function decisionBadgeClass(d: string | null): string {
  switch (d) {
    case "GO":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "CONDITIONAL_GO":
      return "border-sky-200 bg-sky-50 text-sky-950";
    case "RECYCLE":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "HOLD":
      return "border-slate-200 bg-slate-100 text-slate-900";
    case "KILL":
      return "border-red-200 bg-red-50 text-red-950";
    default:
      return "border-slate-200 bg-white text-slate-800";
  }
}

function decisionLabel(d: string | null): string {
  switch (d) {
    case "GO":
      return "GO";
    case "CONDITIONAL_GO":
      return "Conditional Go";
    case "RECYCLE":
      return "Recycle";
    case "HOLD":
      return "Hold";
    case "KILL":
      return "Kill";
    case "NO_GO":
      return "No Go";
    default:
      return d ?? "—";
  }
}

function chainDecisionLabel(d: string): string {
  switch (d) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "ABSTAINED":
      return "Abstained";
    default:
      return d;
  }
}

function stepStatusLabel(s: string): string {
  switch (s) {
    case "PENDING":
      return "Pending";
    case "ACTIVE":
      return "Active";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "SKIPPED":
      return "Skipped";
    default:
      return s;
  }
}

export type GateCycleCardProps = {
  cycle: GateRecordCycle;
  /** Cycle index within the visible list (1-based display helper). */
  positionLabel: string;
};

/**
 * C-7: One gate review cycle — submission snapshot, decision, approver chain. Read-only.
 */
export function GateCycleCard({
  cycle,
  positionLabel,
}: GateCycleCardProps): ReactElement {
  const hasFinalGateDecision =
    Boolean(cycle.gateDecision) && Boolean(cycle.decidedAt);
  const inReview =
    !hasFinalGateDecision &&
    (cycle.submissionStatus === "SUBMITTED" || cycle.submissionStatus === "DRAFT");

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
      aria-label={`Gate cycle ${cycle.cycleNumber}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Cycle {cycle.cycleNumber}
          </h3>
          <span className="text-xs font-medium text-slate-500">{positionLabel}</span>
        </div>
        {cycle.gateDecision ? (
          <span
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold",
              decisionBadgeClass(cycle.gateDecision),
            )}
          >
            {decisionLabel(cycle.gateDecision)}
          </span>
        ) : inReview ? (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950">
            Still in review
          </span>
        ) : (
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            No final gate decision
          </span>
        )}
      </header>

      <div className="space-y-5 px-4 py-4 text-sm text-slate-800">
        <section aria-labelledby={`submission-${cycle.cycleNumber}`}>
          <h4
            id={`submission-${cycle.cycleNumber}`}
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Submission
          </h4>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Submitted by</dt>
              <dd className="font-medium text-slate-900">
                {cycle.submittedByUserName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Submitted at</dt>
              <dd className="font-medium text-slate-900">
                {formatTs(cycle.submittedAt)}
              </dd>
            </div>
          </dl>
          {cycle.submissionNotes ? (
            <div className="mt-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-xs font-semibold text-slate-600">Submission notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {cycle.submissionNotes}
              </p>
            </div>
          ) : null}
          {cycle.submittedArtifacts.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
              {cycle.submittedArtifacts.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{doc.title}</span>
                  {doc.fileName ? (
                    <span className="text-xs text-slate-500">{doc.fileName}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No artifact snapshot on record.</p>
          )}
        </section>

        <section aria-labelledby={`decision-${cycle.cycleNumber}`}>
          <h4
            id={`decision-${cycle.cycleNumber}`}
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Gate decision
          </h4>
          {hasFinalGateDecision ? (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Decided by</dt>
                <dd className="font-medium text-slate-900">
                  {cycle.decidedByUserName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Decided at</dt>
                <dd className="font-medium text-slate-900">
                  {formatTs(cycle.decidedAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600">Still in review</p>
          )}
          {cycle.decisionNotes ? (
            <div className="mt-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-xs font-semibold text-slate-600">Decision notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {cycle.decisionNotes}
              </p>
            </div>
          ) : null}
        </section>

        <section aria-labelledby={`approvers-${cycle.cycleNumber}`}>
          <h4
            id={`approvers-${cycle.cycleNumber}`}
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Approver chain
          </h4>
          {cycle.approvers.length === 0 ? (
            <p className="text-xs text-slate-500">No approver chain on record for this cycle.</p>
          ) : (
            <ul className="space-y-4">
              {cycle.approvers.map((step) => (
                <li
                  key={step.stepId || step.name}
                  className="rounded-md border border-slate-100 bg-slate-50/40 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{step.name}</p>
                    <span className="text-xs font-medium text-slate-600">
                      {stepStatusLabel(step.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {step.role} · {step.approvalType}
                  </p>
                  {step.decisions.length > 0 ? (
                    <ul className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                      {step.decisions.map((d, idx) => (
                        <li key={`${d.userId}-${d.decidedAt}-${idx}`} className="text-sm">
                          <span className="font-medium text-slate-900">
                            {d.actorDisplayName ?? d.userId}
                          </span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="font-medium text-slate-800">
                            {chainDecisionLabel(d.decision)}
                          </span>
                          {d.note ? (
                            <span className="mt-1 block text-xs text-slate-600">
                              {d.note}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {formatTs(d.decidedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No per-step decisions recorded.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {cycle.approvalHistory.length > 0 ? (
          <section aria-labelledby={`history-${cycle.cycleNumber}`}>
            <h4
              id={`history-${cycle.cycleNumber}`}
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Approval activity (record)
            </h4>
            <ul className="space-y-2 text-sm">
              {cycle.approvalHistory.map((h, idx) => (
                <li
                  key={`${h.userId}-${h.decidedAt}-${idx}`}
                  className="flex flex-col rounded border border-slate-100 bg-white px-2 py-1.5"
                >
                  <span>
                    <span className="font-medium text-slate-900">
                      {h.actorDisplayName ?? h.userId}
                    </span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span>{chainDecisionLabel(h.decision)}</span>
                  </span>
                  <span className="text-xs text-slate-500">{formatTs(h.decidedAt)}</span>
                  {h.note ? (
                    <span className="text-xs text-slate-600">{h.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
