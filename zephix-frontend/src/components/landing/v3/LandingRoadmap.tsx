import type { ReactElement } from "react";

const MILESTONES = [
  { period: "Q2 2026", label: "Private Beta" },
  { period: "Q3 2026", label: "Public Launch" },
  { period: "Q4 2026", label: "Enterprise Scale" },
] as const;

export function LandingRoadmap(): ReactElement {
  return (
    <section
      id="roadmap"
      className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
      aria-labelledby="roadmap-heading"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2
          id="roadmap-heading"
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Roadmap
        </h2>
        <ol className="mt-12 space-y-0">
          {MILESTONES.map((m) => (
            <li
              key={m.period}
              className="relative flex gap-6 border-l-2 border-indigo-200 pb-10 pl-8 last:border-l-transparent last:pb-0"
            >
              <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-indigo-600 bg-white" />
              <div>
                <p className="text-sm font-semibold text-indigo-700">{m.period}</p>
                <p className="mt-1 text-base font-medium text-slate-900">{m.label}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
