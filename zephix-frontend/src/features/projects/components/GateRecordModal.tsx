import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Loader2 } from "lucide-react";

import { GateCycleCard } from "./GateCycleCard";
import { normalizeGateRecordPayload } from "./gateRecord.adapter";
import type { GateRecordViewModel } from "./gateRecord.types";

import { getGateRecord } from "@/features/phase-gates/phaseGates.api";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export type GateRecordModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  phaseId: string;
  memberLookup: Map<string, { label: string }>;
};

function reviewStateLabel(rs: string): string {
  switch (rs) {
    case "NOT_STARTED":
      return "Not started";
    case "AWAITING_CONDITIONS":
      return "Awaiting conditions";
    case "READY_FOR_REVIEW":
      return "Ready for review";
    case "IN_REVIEW":
      return "In review";
    case "APPROVED":
    case "DECIDED":
      return "Decided";
    case "REJECTED":
      return "Rejected";
    case "LOCKED":
      return "Locked";
    default:
      return rs;
  }
}

function terminalDecisionFromSummary(vm: GateRecordViewModel): string | null {
  const last = vm.cyclesNewestFirst[0];
  return last?.gateDecision ?? null;
}

/**
 * C-7: Read-only governance record — backend GET …/gate/record only. No mutations.
 * History must not be composed from live `GET …/gate`, approvals list, or approval detail.
 */
export function GateRecordModal({
  open,
  onClose,
  projectId,
  phaseId,
  memberLookup,
}: GateRecordModalProps): ReactElement | null {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordRaw, setRecordRaw] = useState<unknown | null>(null);

  useEffect(() => {
    if (!open || !projectId || !phaseId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRecordRaw(null);
    void getGateRecord(projectId, phaseId)
      .then((raw) => {
        if (cancelled) {
          return;
        }
        if (raw == null) {
          setError("No gate record returned.");
          return;
        }
        setRecordRaw(raw);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, phaseId]);

  const model = useMemo(
    () =>
      recordRaw != null ? normalizeGateRecordPayload(recordRaw, memberLookup) : null,
    [recordRaw, memberLookup],
  );

  if (!open) {
    return null;
  }

  const summary = model?.summary;
  const cycles = model?.cyclesNewestFirst ?? [];
  const parseError =
    !loading && !error && recordRaw != null && model == null
      ? "Unable to parse gate record."
      : null;
  const currentNum = summary?.currentCycleNumber ?? null;
  const total = summary?.totalCycles ?? 0;
  const cycleSummary =
    currentNum != null && total > 0
      ? `Cycle ${currentNum} of ${total}`
      : total > 0
        ? `${total} cycle${total === 1 ? "" : "s"}`
        : null;

  const terminal = model ? terminalDecisionFromSummary(model) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-record-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="gate-record-modal-title"
                className="text-lg font-semibold tracking-tight text-slate-900"
              >
                {summary?.gateName ?? "Gate record"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {summary ? (
                  <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {reviewStateLabel(summary.reviewState)}
                  </span>
                ) : null}
                {terminal ? (
                  <span
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-semibold",
                      terminal === "GO"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : terminal === "RECYCLE"
                          ? "border-amber-200 bg-amber-50 text-amber-950"
                          : "border-slate-200 bg-white text-slate-800",
                    )}
                  >
                    {terminal}
                  </span>
                ) : null}
                {cycleSummary ? (
                  <span className="text-xs font-medium text-slate-600">{cycleSummary}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Read-only governance record. Data is shown as returned by the server for each cycle.
          </p>
        </div>

        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden />
              Loading gate record…
            </div>
          ) : null}
          {(error ?? parseError) && !loading ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              role="alert"
            >
              {error ?? parseError}
            </div>
          ) : null}
          {!loading && !error && model && cycles.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">
              No cycle history on record yet.
            </p>
          ) : null}
          {!loading && !error && cycles.length > 0 ? (
            <div className="space-y-6">
              {cycles.map((c, idx) => (
                <GateCycleCard
                  key={`${c.cycleId ?? "cycle"}-${c.cycleNumber}-${idx}`}
                  cycle={c}
                  positionLabel={`${idx + 1} of ${cycles.length} (newest first)`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
