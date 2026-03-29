import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { Loader2 } from "lucide-react";

import type { GateDecisionOption } from "./gateDecision.types";
import {
  derivePhaseBadgeStatus,
  getTaskEffectiveStateForUi,
} from "./tasks-tab.utils";

import {
  decideProjectApprovalGate,
  getProjectApproval,
  type ApprovalDetail,
} from "@/features/projects/governance.api";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { WorkPhaseListItem, WorkTask } from "@/features/work-management/workTasks.api";

/** Prefer `submissionNote`; legacy rows may only have PM text in `decisionNote` before `decidedAt`. */
function submissionNotesForDisplay(detail: ApprovalDetail | null): string {
  if (!detail) {
    return "";
  }
  const primary = detail.submissionNote?.trim();
  if (primary) {
    return primary;
  }
  if (!detail.decidedAt && detail.decisionNote?.trim()) {
    return detail.decisionNote.trim();
  }
  return "";
}

export type GateDecisionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  projectId: string;
  approvalId: string | null;
  gateName: string;
  phaseName?: string;
  /** Full project task list — used to resolve snapshot task ids to title / assignee / completion. */
  tasks: WorkTask[];
  phases: WorkPhaseListItem[];
  assigneeLookup: Map<string, { label: string; initials: string }>;
  /** When false, decision controls are disabled (viewer / guest). */
  canSubmitDecision: boolean;
};

const OPTIONS: Array<{
  value: GateDecisionOption;
  label: string;
  tone: string;
  ring: string;
}> = [
  {
    value: "GO",
    label: "Proceed",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
    ring: "ring-emerald-300",
  },
  {
    value: "CONDITIONAL_GO",
    label: "Conditional Go",
    tone: "border-sky-200 bg-sky-50 text-sky-950",
    ring: "ring-sky-400",
  },
  {
    value: "RECYCLE",
    label: "Rework Required",
    tone: "border-amber-200 bg-amber-50 text-amber-950",
    ring: "ring-amber-400",
  },
  {
    value: "HOLD",
    label: "On Hold",
    tone: "border-slate-200 bg-slate-100 text-slate-900",
    ring: "ring-slate-400",
  },
  {
    value: "KILL",
    label: "Terminate",
    tone: "border-red-200 bg-red-50 text-red-950",
    ring: "ring-red-400",
  },
];

function displayStepState(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "AWAITING";
    case "SKIPPED":
      return "ABSTAIN";
    default:
      return status;
  }
}

function decisionBadgeClass(d: string): string {
  switch (d) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-900";
    case "ABSTAINED":
      return "border-slate-200 bg-slate-50 text-slate-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

/**
 * C-5: Approver reviews a submitted gate approval — UI reflects backend state; only decision is mutable.
 */
export function GateDecisionModal({
  open,
  onClose,
  onSuccess,
  projectId,
  approvalId,
  gateName,
  phaseName,
  tasks,
  phases,
  assigneeLookup,
  canSubmitDecision,
}: GateDecisionModalProps): ReactElement | null {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDecision, setSelectedDecision] = useState<GateDecisionOption | null>(null);
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState<string[]>([""]);
  const [killConfirm, setKillConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const phaseById = useMemo(() => {
    const m = new Map<string, WorkPhaseListItem>();
    for (const p of phases) {
      m.set(p.id, p);
    }
    return m;
  }, [phases]);

  const artifactRows = useMemo(() => {
    if (!detail?.linkedEvidence?.length) {
      return [];
    }
    return detail.linkedEvidence.map((ev) => {
      const task = tasks.find((t) => t.id === ev.id);
      const phase = task?.phaseId ? phaseById.get(task.phaseId) ?? null : null;
      const tasksInPhase =
        task?.phaseId != null
          ? tasks.filter((t) => t.phaseId === task.phaseId)
          : [];
      const phaseDisplay = derivePhaseBadgeStatus(phase, tasksInPhase);
      const title = task?.title || ev.title || ev.id;
      const uid = task?.assigneeUserId;
      const a = uid ? assigneeLookup.get(uid) : undefined;
      const eff = task
        ? getTaskEffectiveStateForUi(task, phase, phaseDisplay)
        : null;
      const done = eff != null && (eff === "DONE" || eff === "ARCHIVED");
      return {
        id: ev.id,
        title,
        assigneeLabel: a?.label ?? "—",
        assigneeInitials: a?.initials,
        done,
      };
    });
  }, [assigneeLookup, detail?.linkedEvidence, phaseById, tasks]);

  const loadDetail = useCallback(async () => {
    if (!projectId || !approvalId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const d = await getProjectApproval(projectId, approvalId);
      setDetail(d);
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [approvalId, projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedDecision(null);
    setNotes("");
    setConditions([""]);
    setKillConfirm("");
    setSubmitError(null);
    void loadDetail();
  }, [open, approvalId, loadDetail]);

  if (!open) {
    return null;
  }

  const titlePhase = phaseName ? ` — ${phaseName}` : "";
  const submissionNotes = submissionNotesForDisplay(detail);

  const notesRequired =
    selectedDecision === "CONDITIONAL_GO" ||
    selectedDecision === "RECYCLE" ||
    selectedDecision === "HOLD" ||
    selectedDecision === "KILL";

  const canSubmit =
    canSubmitDecision &&
    Boolean(selectedDecision) &&
    (!notesRequired || notes.trim().length > 0) &&
    (selectedDecision !== "CONDITIONAL_GO" ||
      conditions.some((c) => c.trim().length > 0)) &&
    (selectedDecision !== "KILL" || killConfirm === "KILL");

  const handleSubmit = async (): Promise<void> => {
    if (!approvalId || !selectedDecision || !canSubmit || submitting) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const trimmedNotes = notes.trim();
      const payload = {
        decision: selectedDecision,
        notes: trimmedNotes,
        conditions:
          selectedDecision === "CONDITIONAL_GO"
            ? conditions
                .map((c) => c.trim())
                .filter(Boolean)
                .map((description) => ({ description }))
            : undefined,
      };
      await decideProjectApprovalGate(projectId, approvalId, payload);
      await onSuccess();
      onClose();
    } catch (e: unknown) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-decision-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <h2
            id="gate-decision-modal-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            {gateName} — Review
            <span className="font-normal text-slate-500">{titlePhase}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Review the submission snapshot and approval chain. Only your decision is submitted to the
            server.
          </p>
        </div>

        <div className="grid max-h-[calc(92vh-180px)] grid-cols-1 divide-y divide-slate-200 overflow-hidden lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="max-h-[calc(92vh-180px)] overflow-y-auto p-6 lg:col-span-2">
            {loading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden />
                Loading submission…
              </div>
            ) : loadError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {loadError}
              </p>
            ) : (
              <>
                <section className="mb-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Submission notes
                  </h3>
                  {submissionNotes ? (
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
                      {submissionNotes}
                    </p>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-sm italic text-slate-500">
                      No notes were provided with this submission.
                    </p>
                  )}
                </section>

                <section className="mb-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Submitted artifacts
                  </h3>
                  {artifactRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-600">
                      No artifact snapshot on this approval.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {artifactRows.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm"
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
                              row.done
                                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                : "bg-amber-50 text-amber-900 ring-amber-200",
                            )}
                            aria-hidden
                            title={row.done ? "Complete" : "Not complete"}
                          >
                            {row.done ? "✓" : "!"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900">{row.title}</p>
                            <p className="text-xs text-slate-500">
                              {row.done ? "Completed" : "Incomplete"} · Assignee {row.assigneeLabel}
                            </p>
                          </div>
                          {row.assigneeInitials ? (
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                              title={row.assigneeLabel}
                            >
                              {row.assigneeInitials}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Approver chain
                  </h3>
                  {!detail?.approvers?.length ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-600">
                      No approval chain steps returned for this submission.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {detail.approvers.map((ap) => (
                        <li key={ap.stepId} className="px-3 py-3 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-900">{ap.name}</p>
                              <p className="text-xs text-slate-500">
                                {ap.role ?? ap.approvalType ?? "Approver"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800">
                              {displayStepState(ap.status)}
                            </span>
                          </div>
                          {ap.decisions?.length ? (
                            <ul className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                              {ap.decisions.map((d, idx) => (
                                <li
                                  key={`${d.userId}-${idx}`}
                                  className="flex flex-wrap items-start gap-2 text-xs"
                                >
                                  <span
                                    className={cn(
                                      "rounded-md border px-2 py-0.5 font-semibold",
                                      decisionBadgeClass(d.decision),
                                    )}
                                  >
                                    {d.decision}
                                  </span>
                                  {d.note ? (
                                    <span className="text-slate-600">{d.note}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>

          <div className="flex max-h-[calc(92vh-180px)] flex-col overflow-y-auto border-t border-slate-200 bg-slate-50/40 p-6 lg:border-t-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decision
            </h3>
            {!canSubmitDecision ? (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                You do not have permission to record a gate decision in this workspace.
              </p>
            ) : null}
            <div className="space-y-2">
              {OPTIONS.map((opt) => {
                const selected = selectedDecision === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!canSubmitDecision || submitting}
                    onClick={() => setSelectedDecision(opt.value)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-shadow",
                      opt.tone,
                      selected && `ring-2 ${opt.ring}`,
                      (!canSubmitDecision || submitting) && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {selectedDecision === "CONDITIONAL_GO" ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-slate-600">Conditions</p>
                <div className="space-y-2">
                  {conditions.map((c, i) => (
                    <input
                      key={i}
                      type="text"
                      value={c}
                      disabled={!canSubmitDecision || submitting}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = e.target.value;
                        setConditions(next);
                      }}
                      placeholder={`Condition ${i + 1}`}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!canSubmitDecision || submitting}
                  className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  onClick={() => setConditions((prev) => [...prev, ""])}
                >
                  + Add condition
                </button>
              </div>
            ) : null}

            {selectedDecision === "KILL" ? (
              <div className="mt-4">
                <label
                  htmlFor="gate-decision-kill-confirm"
                  className="mb-1 block text-xs font-medium text-slate-600"
                >
                  Type <span className="font-mono font-semibold">KILL</span> to confirm
                </label>
                <input
                  id="gate-decision-kill-confirm"
                  type="text"
                  autoComplete="off"
                  disabled={!canSubmitDecision || submitting}
                  value={killConfirm}
                  onChange={(e) => setKillConfirm(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
              </div>
            ) : null}

            <div className="mt-4 flex-1">
              <label
                htmlFor="gate-decision-notes"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Decision notes
                {notesRequired ? (
                  <span className="text-red-600"> *</span>
                ) : (
                  <span className="text-slate-400"> (optional for Proceed)</span>
                )}
              </label>
              <textarea
                id="gate-decision-notes"
                rows={5}
                disabled={!canSubmitDecision || submitting}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {submitError ? (
              <p
                className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={() => void handleSubmit()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  "Submit decision"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
