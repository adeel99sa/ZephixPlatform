import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function StagingMarketingHero() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setFrame((f) => (f + 1) % 3), 3000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className="border-b border-slate-100 bg-white px-8 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950">
            <span aria-hidden>🔨</span>
            <span>Currently in final development</span>
            <span className="hidden sm:inline" aria-hidden>
              •
            </span>
            <span>Beta launches Q2 2026</span>
          </p>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-800">
            <span aria-hidden>⚡</span> Delivery intelligence platform
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
            See Every Conflict Before It Cascades
          </h1>
          <p className="mt-6 text-lg text-slate-600 md:text-xl">
            Most project tools track tasks in isolation. They don&apos;t warn you when one delay silently breaks three other deadlines, or when your key person is double-booked across critical launches.
          </p>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            Zephix connects the dots—detecting resource conflicts and cascade risks across your entire delivery portfolio automatically.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => scrollToId("waitlist")}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Join Q2 Beta Waitlist
            </button>
            <button
              type="button"
              onClick={() => scrollToId("template-center")}
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              View Template Gallery
            </button>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Private beta opens April 2026. Founding members get lifetime pricing (50% off).
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <span>✓ Planned for beta: evaluate free tier limits</span>
            <span>✓ No credit card to join waitlist</span>
            <span>✓ CSV import targeted for Q2 beta</span>
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
          role="img"
          aria-label="Resource conflict detection showing overallocation impact across three connected projects"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-transparent pointer-events-none" />
          <div className="relative min-h-[280px] md:min-h-[320px]">
            <div className={`absolute inset-0 transition-opacity duration-500 ${frame === 0 ? "opacity-100" : "opacity-0"}`}>
              <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Resource heatmap</p>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-medium text-slate-800">Sarah</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">120% allocation</span>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-slate-100">
                  <div className="h-3 w-[120%] max-w-full rounded-full bg-red-500" style={{ width: "100%" }} />
                </div>
                <p className="mt-2 text-xs text-red-700">Critical overallocation — approval workflow</p>
              </div>
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ${frame === 1 ? "opacity-100" : "opacity-0"}`}>
              <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Assignments</p>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Assigned to:</p>
                <ul className="list-disc pl-5 text-slate-600">
                  <li>API Project</li>
                  <li>Mobile Launch</li>
                </ul>
              </div>
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ${frame === 2 ? "opacity-100" : "opacity-0"}`}>
              <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Cascade view</p>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-col gap-2 text-slate-700">
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-900">API Project delay</span>
                  <span className="text-slate-400">→</span>
                  <span className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-900">Blocks Mobile</span>
                  <span className="text-slate-400">→</span>
                  <span className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-900">Blocks Web Redesign</span>
                </div>
              </div>
            </div>
          </div>
          <p className="relative mt-4 text-center text-xs text-slate-500">
            Animated preview — if motion is reduced, all states are still readable in sequence.
          </p>
          <div className="relative mt-4 text-center">
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:underline">
              Sign in for live product
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
