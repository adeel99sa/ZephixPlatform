import type { ReactElement } from "react";
import { CircleCheck, Lock } from "lucide-react";

import type { InlinePhaseGate } from "./inline-phase-gate.types";

import { cn } from "@/lib/utils";

export type InlineGateRowProps = {
  gate: InlinePhaseGate;
  /** C-4: Parent opens submit modal — only used when gate state is READY. */
  onRequestSubmitForReview?: () => void;
  /** C-5: Parent opens decision modal — only used when gate state is IN_REVIEW. */
  onRequestViewDetails?: () => void;
  /** C-7: Parent opens read-only gate record — only used when gate state is DECIDED. */
  onRequestViewRecord?: () => void;
  /** C-7: Prior cycles exist — only when IN_REVIEW and cycleNumber > 1. */
  onRequestViewHistory?: () => void;
};

function decidedLabel(decision: InlinePhaseGate["decision"]): string {
  switch (decision) {
    case "GO":
      return "Approved";
    case "CONDITIONAL_GO":
      return "Conditional Go";
    case "RECYCLE":
      return "Changes Required";
    case "HOLD":
      return "On Hold";
    case "KILL":
      return "Terminated";
    default:
      return "Decided";
  }
}

function decidedTone(decision: InlinePhaseGate["decision"]): string {
  switch (decision) {
    case "GO":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "CONDITIONAL_GO":
      return "border-lime-200 bg-lime-50 text-lime-950";
    case "RECYCLE":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "HOLD":
      return "border-amber-100 bg-amber-50/80 text-amber-900";
    case "KILL":
      return "border-red-200 bg-red-50 text-red-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

function statusLabel(gate: InlinePhaseGate): { text: string; tone: string } {
  switch (gate.state) {
    case "LOCKED":
      return { text: "Locked", tone: "text-slate-600" };
    case "READY":
      return { text: "Ready for Review", tone: "text-blue-800" };
    case "IN_REVIEW":
      return { text: "In Review", tone: "text-amber-800" };
    case "DECIDED":
      return {
        text: decidedLabel(gate.decision),
        tone: decidedTone(gate.decision),
      };
    default:
      return { text: gate.state, tone: "text-slate-700" };
  }
}

/**
 * C-8: Primary gate actions disabled when backend reports open PENDING conditions.
 */
function actionForState(
  gate: InlinePhaseGate,
  onRequestSubmitForReview?: () => void,
  onRequestViewDetails?: () => void,
  onRequestViewRecord?: () => void,
): {
  label: string;
  handler: () => void;
} | null {
  switch (gate.state) {
    case "LOCKED":
      return null;
    case "READY":
      return {
        label: "Submit for Review",
        handler: () => {
          onRequestSubmitForReview?.();
        },
      };
    case "IN_REVIEW":
      return {
        label: "View Details",
        handler: () => {
          onRequestViewDetails?.();
        },
      };
    case "DECIDED":
      return {
        label: "View Record",
        handler: () => {
          onRequestViewRecord?.();
        },
      };
    default:
      return null;
  }
}

/**
 * C-3: Governance checkpoint between phases — not a task row.
 * C-8: `blockedByConditionsCount` from API disables actions — no client-side blocker math.
 */
export function InlineGateRow({
  gate,
  onRequestSubmitForReview,
  onRequestViewDetails,
  onRequestViewRecord,
  onRequestViewHistory,
}: InlineGateRowProps): ReactElement {
  const status = statusLabel(gate);
  const blockedCount = gate.blockedByConditionsCount ?? 0;
  const blocked = blockedCount > 0;

  const action = actionForState(
    gate,
    onRequestSubmitForReview,
    onRequestViewDetails,
    onRequestViewRecord,
  );
  const isLocked = gate.state === "LOCKED";
  const isDecided = gate.state === "DECIDED";
  const showViewHistory =
    gate.state === "IN_REVIEW" &&
    typeof gate.cycleNumber === "number" &&
    gate.cycleNumber > 1 &&
    Boolean(onRequestViewHistory);

  const decidedAccent =
    isDecided && gate.decision
      ? {
          GO: "border-l-emerald-500",
          CONDITIONAL_GO: "border-l-lime-500",
          RECYCLE: "border-l-amber-500",
          HOLD: "border-l-slate-400",
          KILL: "border-l-red-500",
        }[gate.decision] ?? "border-l-slate-300"
      : "border-l-transparent";

  const showPrimaryDisabled =
    blocked &&
    (gate.state === "READY" || gate.state === "IN_REVIEW") &&
    Boolean(action);

  return (
    <div
      className={cn(
        "border-y border-slate-200 bg-slate-50/90 border-l-4",
        decidedAccent,
      )}
      role="group"
      aria-label={`Gate ${gate.name}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {isLocked ? (
            <Lock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          ) : (
            <CircleCheck className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {gate.name}
            </p>
            {isDecided ? (
              <span
                className={cn(
                  "mt-0.5 inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                  status.tone,
                )}
              >
                {status.text}
              </span>
            ) : (
              <p className={cn("text-xs font-medium", status.tone)}>
                {status.text}
              </p>
            )}
            {blocked ? (
              <p className="mt-1 text-xs font-medium text-amber-900" role="status">
                Blocked by {blockedCount} open condition{blockedCount === 1 ? "" : "s"}.
                {gate.state === "READY" ||
                gate.state === "IN_REVIEW" ||
                gate.state === "LOCKED"
                  ? " Waiting for condition completion."
                  : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {showPrimaryDisabled ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-sm"
              title={
                gate.state === "IN_REVIEW"
                  ? "Waiting for condition completion."
                  : `Blocked by ${blockedCount} open condition${blockedCount === 1 ? "" : "s"}.`
              }
            >
              {action?.label}
            </button>
          ) : action ? (
            <button
              type="button"
              onClick={action.handler}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
            >
              {action.label}
            </button>
          ) : null}
          {showViewHistory ? (
            <button
              type="button"
              onClick={() => onRequestViewHistory?.()}
              className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
            >
              View History
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
