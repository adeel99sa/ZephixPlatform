import type { ReactElement } from "react";

import { RESOURCE_RISK_CAMPAIGN_SLUG } from "./resource-risk-constants";

const PILLARS = [
  {
    title: "Resource conflict detection",
    body:
      "Surface when commitments collide — same roles, same week, competing critical paths — before overload becomes a delivery miss.",
  },
  {
    title: "Dependency awareness",
    body:
      "Make handoffs and predecessors explicit so a slip in one thread is visible to every downstream owner, not buried in a deck.",
  },
  {
    title: "Risk propagation visibility",
    body:
      "Show how delay and contention move through the graph so teams respond to systemic pressure, not isolated red/yellow dots.",
  },
] as const;

export function ResourceRiskPillarsSection(): ReactElement {
  return (
    <section
      data-section="pillars"
      data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
      className="border-b border-slate-200 bg-white py-16 sm:py-20"
      aria-labelledby="campaign-pillars-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="campaign-pillars-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          How execution breaks — and how the system sees it
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
