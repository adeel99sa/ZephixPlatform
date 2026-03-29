import type { ReactElement } from "react";

export function LandingBridge(): ReactElement {
  return (
    <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Most tools track work. Zephix controls execution.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          Task lists do not prevent project failure. You need a system that understands
          governance, capacity, and risk together.
        </p>
      </div>
    </section>
  );
}
