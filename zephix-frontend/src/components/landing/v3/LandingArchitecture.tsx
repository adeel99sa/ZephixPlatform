import type { ReactElement } from "react";

export function LandingArchitecture(): ReactElement {
  return (
    <section
      id="architecture"
      className="border-b border-slate-200 bg-white py-16 sm:py-24"
      aria-labelledby="architecture-heading"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2
          id="architecture-heading"
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          The Architecture of Accountability
        </h2>
        <p className="mt-5 text-center text-base leading-relaxed text-slate-600 sm:text-lg">
          Legacy tools treat projects as flat lists. Zephix connects tasks, resources, risks, and
          governance in one relational system so downstream impact is visible before delivery slips.
        </p>
      </div>
    </section>
  );
}
