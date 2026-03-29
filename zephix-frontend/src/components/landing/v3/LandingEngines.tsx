import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

export function LandingEngines(): ReactElement {
  return (
    <section
      id="engines"
      className="border-b border-slate-200 bg-slate-50 py-16 sm:py-24"
      aria-labelledby="engines-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="engines-heading"
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Built on Five Native Engines. Not Plugins.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-4 lg:grid-rows-3 lg:gap-5">
          {/* Governance — dominant */}
          <article
            className={cn(
              "flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8",
              "lg:col-span-2 lg:row-span-3 lg:min-h-[320px]",
            )}
          >
            <h3 className="text-xl font-semibold text-slate-900">Governance Engine</h3>
            <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-600">
              Progressive phase gates with approvals, enforcement, and auditability built directly
              into execution.
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-3 lg:row-start-1">
            <h3 className="text-base font-semibold text-slate-900">Capacity Engine</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Plan workload before commitment. Prevent over-allocation early.
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-4 lg:row-start-1">
            <h3 className="text-base font-semibold text-slate-900">Resource Engine</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Track allocation across projects in real time.
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-3 lg:row-start-2">
            <h3 className="text-base font-semibold text-slate-900">Risk Engine</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Surface delays and dependencies before they escalate.
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-4 lg:row-start-2 lg:row-end-4">
            <h3 className="text-base font-semibold text-slate-900">AI Engine</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Role-aware assistant aligned with governance and project state.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
