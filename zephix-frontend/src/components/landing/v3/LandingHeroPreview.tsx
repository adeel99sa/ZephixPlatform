import type { ReactElement } from "react";
import { AlertTriangle, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Illustrative UI-only panel — not live data. Shows governance + risk at a glance.
 */
export function LandingHeroPreview(): ReactElement {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-md ring-1 ring-slate-900/5"
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Project overview
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Demo
        </span>
      </div>

      {/* Phase gate row */}
      <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-amber-950">
              Gate 2: Design Review
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-800">IN REVIEW</p>
          </div>
          <span className="shrink-0 rounded border border-amber-300/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
            Governance
          </span>
        </div>
      </div>

      {/* Blocked task */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <Lock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-800">
            API integration — blocked by gate
          </p>
          <p className="text-[11px] text-slate-500">Awaiting approval</p>
        </div>
      </div>

      {/* Resource conflict */}
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border px-3 py-2",
          "border-red-200 bg-red-50/90",
        )}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />
        <p className="text-xs font-medium leading-snug text-red-950">
          Resource conflict: Sarah J. over-allocated across two projects this week.
        </p>
      </div>
    </div>
  );
}
