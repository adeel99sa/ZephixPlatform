import type { ReactElement } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Illustrative panel only — not live data. One dominant signal (resource conflict), secondary (gate), tertiary (dependency).
 */
export function ResourceRiskCampaignPreview(): ReactElement {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-md ring-1 ring-slate-900/5"
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Delivery impact
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Demo
        </span>
      </div>

      {/* Dominant: resource conflict */}
      <div
        className={cn(
          "mb-3 rounded-xl border-2 px-4 py-4 shadow-sm",
          "border-red-300 bg-gradient-to-b from-red-50 to-white",
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden />
          <div>
            <p className="text-sm font-bold text-red-950">Resource conflict</p>
            <p className="mt-1.5 text-[13px] leading-snug text-red-900">
              Two critical paths demand the same lead engineer this week — overload before work is
              rebalanced.
            </p>
          </div>
        </div>
      </div>

      {/* Secondary: gate blocked (smaller) */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
        <div>
          <p className="text-[11px] font-semibold text-amber-950">Gate blocked</p>
          <p className="mt-0.5 text-[10px] leading-snug text-amber-900/95">
            Release gate — open conditions must be satisfied before review can close.
          </p>
        </div>
      </div>

      {/* Tertiary: dependency chain (muted, compact) */}
      <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2 opacity-90">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Dependency chain
        </p>
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-slate-600">
          <span className="rounded border border-slate-200/80 bg-white px-1.5 py-0.5">Design</span>
          <ArrowRight className="h-2.5 w-2.5 shrink-0 text-slate-300" aria-hidden />
          <span className="rounded border border-slate-200/80 bg-white px-1.5 py-0.5">API</span>
          <ArrowRight className="h-2.5 w-2.5 shrink-0 text-slate-300" aria-hidden />
          <span className="rounded border border-amber-200/60 bg-amber-50/80 px-1.5 py-0.5 text-amber-900">
            Release
          </span>
          <span className="ml-0.5 text-[9px] text-slate-400">+5d slip</span>
        </div>
        <p className="mt-1.5 text-[9px] leading-snug text-slate-500">
          Delay propagation visible along the chain — not only at the milestone.
        </p>
      </div>

      <p className="mt-2.5 text-[10px] leading-snug text-slate-500">
        <span className="font-medium text-slate-600">Visibility gap: </span>
        spreadsheets showed green; the execution graph surfaced the collision first.
      </p>
    </div>
  );
}
