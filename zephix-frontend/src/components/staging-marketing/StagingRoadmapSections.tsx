import React from "react";
import { Hammer, Radio } from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/** Honest product roadmap — current as of March 2026; Q2 beta target. */
export function StagingRoadmapSection() {
  return (
    <section id="roadmap" className="border-y border-slate-200 bg-slate-50 px-8 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Development Roadmap</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">Current as of March 2026</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Q1 ends March 31
            </span>
          </div>

          <div className="mt-8 space-y-10">
            <article>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Q1 2026 — Final development phase</h3>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600">Core platform completion (through March 31)</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>Resource Management module (75% → 100%)</li>
                <li>Risk Management foundation (60% → 100%)</li>
                <li>Dashboard Builder (Projects At Risk, Overdue, Capacity)</li>
                <li>Template Center (6 methodology templates)</li>
                <li>Cross-workspace assignment architecture</li>
              </ul>
              <p className="mt-3 text-sm text-slate-600">Status: Internal testing &amp; bug fixes</p>
            </article>

            <article>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full border-2 border-indigo-400 bg-white" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Q2 2026 — Private beta launch (April–June)</h3>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600">Founding Member Program</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>50 select organizations onboarded</li>
                <li>CSV/Excel import with conflict detection</li>
                <li>Basic AI contextual assistance</li>
                <li>Phase-gate governance (optional)</li>
                <li>Priority: Stability &amp; onboarding flow</li>
              </ul>
            </article>

            <article>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full border-2 border-slate-300 bg-white" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Q3 2026 — Public launch (July–September)</h3>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600">General availability</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>Self-serve signup open</li>
                <li>Complete Template Library (12+ templates)</li>
                <li>Advanced AI features (task creation, pattern recognition)</li>
                <li>SOC 2 Type II compliance</li>
                <li>Pricing: $20 / $35 tiers active</li>
              </ul>
            </article>

            <article>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full border-2 border-slate-300 bg-white" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Q4 2026 — Enterprise scale (October–December)</h3>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600">Advanced operations</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>Agentic AI workflows (admin-configured automation)</li>
                <li>SSO/SAML &amp; audit logs</li>
                <li>Advanced analytics &amp; custom reporting</li>
                <li>Enterprise integrations (Slack, Jira sync)</li>
              </ul>
            </article>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={() => scrollToId("building-in-public")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Radio className="h-4 w-4" aria-hidden />
              View live progress
            </button>
            <button
              type="button"
              onClick={() => scrollToId("waitlist")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Join waitlist for Q2 beta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Weekly-style changelog — Q1 build transparency. */
export function StagingBuildingInPublicSection() {
  return (
    <section id="building-in-public" className="bg-white px-8 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-8 md:p-10">
          <div className="flex items-center gap-2 text-indigo-900">
            <Hammer className="h-6 w-6 shrink-0" aria-hidden />
            <h2 className="text-xl font-extrabold md:text-2xl">What we&apos;re building this quarter</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">Weekly updates from the development team (staging preview)</p>

          <ul className="mt-8 space-y-4 border-l-2 border-indigo-200 pl-6 text-sm text-slate-800">
            <li>
              <span className="font-semibold text-slate-900">Week of March 23:</span> Resource threshold algorithms (80–120%)
            </li>
            <li>
              <span className="font-semibold text-slate-900">Week of March 30:</span> Dashboard widget persistence
            </li>
            <li>
              <span className="font-semibold text-slate-900">April:</span> Cross-workspace assignment logic
            </li>
            <li>
              <span className="font-semibold text-slate-900">May:</span> Template automation engine
            </li>
          </ul>

          <button
            type="button"
            className="mt-8 w-full rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 sm:w-auto"
            onClick={() => scrollToId("waitlist")}
          >
            Subscribe to weekly changelog (via waitlist)
          </button>
          <p className="mt-3 text-xs text-slate-500">
            We&apos;ll use your waitlist email to share product changelog updates during beta—no spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
