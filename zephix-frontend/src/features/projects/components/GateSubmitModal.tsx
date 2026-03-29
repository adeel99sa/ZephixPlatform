import { useEffect, useState, type ReactElement } from "react";
import { Loader2 } from "lucide-react";

import type { GateSubmitApproverRow, GateSubmitArtifactRow } from "./gateSubmit.types";
import { formatTaskDueDate } from "./tasks-tab.utils";

import { submitPhaseGateForReview } from "@/features/projects/governance.api";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export type GateSubmitModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after backend success — refetch / invalidation lives in the parent. */
  onSuccess: () => void | Promise<void>;
  projectId: string;
  phaseId: string;
  phaseName?: string;
  gate: { id: string; name: string; state: string };
  artifactTasks: GateSubmitArtifactRow[];
  approvers: GateSubmitApproverRow[];
  approversLoading?: boolean;
};

/**
 * C-4: Handoff confirmation + optional notes — no governance structure editing.
 */
export function GateSubmitModal({
  open,
  onClose,
  onSuccess,
  projectId,
  phaseId,
  phaseName,
  gate,
  artifactTasks,
  approvers,
  approversLoading = false,
}: GateSubmitModalProps): ReactElement | null {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNotes("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, gate.id]);

  if (!open) {
    return null;
  }

  const titlePhase = phaseName ? ` — ${phaseName}` : "";

  const handleSubmit = async (): Promise<void> => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPhaseGateForReview(
        projectId,
        phaseId,
        gate.id,
        notes.trim(),
      );
      await onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-submit-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <h2
            id="gate-submit-modal-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Submit {gate.name} for Review
            <span className="font-normal text-slate-500">{titlePhase}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Confirm the artifact snapshot and approvers before sending this gate to review.
          </p>
        </div>

        <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-6 py-5">
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Included Artifacts
            </h3>
            {artifactTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-600">
                No completed gate-artifact tasks in this phase yet. Complete required artifacts
                before submitting.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {artifactTasks.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        Due {formatTaskDueDate(row.dueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {row.assigneeInitials ? (
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                          title={row.assigneeLabel ?? "Assignee"}
                        >
                          {row.assigneeInitials}
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          —
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approvers
            </h3>
            {approversLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden />
                Loading approvers…
              </div>
            ) : approvers.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-600">
                No approval chain is configured for this gate. Submission may still proceed if
                your organization allows it.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {approvers.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {(a.name || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{a.name}</p>
                        {a.roleLabel ? (
                          <p className="text-xs text-slate-500">{a.roleLabel}</p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                      Pending
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6">
            <label
              htmlFor="gate-submit-notes"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Submission Notes (Optional)
            </label>
            <textarea
              id="gate-submit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={submitting}
              placeholder="Add any context, links, or notes for the approvers..."
              className={cn(
                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
                "placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100",
                submitting && "cursor-not-allowed opacity-70",
              )}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          {error ? (
            <p
              className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                "Submit to Approvers"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
