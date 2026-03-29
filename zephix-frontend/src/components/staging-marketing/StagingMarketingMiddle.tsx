import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  Bot,
  GitBranch,
  HelpCircle,
  Kanban,
  LayoutGrid,
  MapPin,
  Rocket,
  Server,
  UserCog,
} from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function StagingVisibilityGap() {
  return (
    <section className="bg-slate-50 px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-600">The problem</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">The Visibility Gap</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
          Traditional project management creates three critical blind spots
        </p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <AlertOctagon className="h-10 w-10 text-amber-600" aria-hidden />
            <h3 className="mt-4 text-xl font-bold text-slate-900">Status Reports Lie</h3>
            <p className="mt-3 text-slate-600">
              Every project shows &quot;on track&quot; until suddenly it&apos;s not. Without cross-project visibility, problems hide in the gaps between teams.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
              <div className="rounded bg-green-100 p-2 text-center font-medium text-green-900">3 projects all green</div>
              <div className="rounded bg-red-100 p-2 text-center font-medium text-red-900">Reality: 1 delay → 2 blocked</div>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <GitBranch className="h-10 w-10 text-indigo-600" aria-hidden />
            <h3 className="mt-4 text-xl font-bold text-slate-900">Cascade Failures</h3>
            <p className="mt-3 text-slate-600">
              One deadline slip silently breaks dependencies across multiple workstreams. No early warning. Just sudden failure.
            </p>
            <div className="mt-6 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-700">
              <div className="rounded border border-slate-200 bg-white px-2 py-1">API Module</div>
              <div className="pl-2 text-slate-400">↓</div>
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1">Mobile App</div>
              <div className="pl-2 text-slate-400">↓</div>
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1">Web Launch</div>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <HelpCircle className="h-10 w-10 text-violet-600" aria-hidden />
            <h3 className="mt-4 text-xl font-bold text-slate-900">The Overload Problem</h3>
            <p className="mt-3 text-slate-600">
              Your lead is booked on three critical launches this week. No single view shows the conflict until someone calls in sick.
            </p>
            <div className="mt-6 grid grid-cols-5 gap-1 text-[10px]">
              {["M", "T", "W", "T", "F"].map((d, i) => (
                <div key={d + i} className="text-center font-semibold text-slate-500">{d}</div>
              ))}
              <div className="col-span-5 mt-1 grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-8 rounded ${i === 3 ? "bg-red-400" : "bg-green-200"}`}
                    title={i === 3 ? "Triple-booking Thursday" : ""}
                  />
                ))}
              </div>
            </div>
          </article>
        </div>
        <p className="mt-16 text-center text-lg font-medium text-slate-800">
          These aren&apos;t people problems. They&apos;re architecture problems.
        </p>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => scrollToId("platform")}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            See How Zephix Solves This →
          </button>
        </div>
      </div>
    </section>
  );
}

export function StagingPlatformSection() {
  const [hover, setHover] = useState<"none" | "ws" | "proj">("none");
  return (
    <section id="platform" className="bg-white px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-600">The solution</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">Unified Delivery Intelligence</h2>
        <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-slate-600">
          Three tiers of visibility. From simple execution to strategic portfolio management—without switching platforms.
        </p>

        <div
          className="mx-auto mt-12 max-w-4xl rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-sm text-slate-800 shadow-inner"
          onMouseLeave={() => setHover("none")}
        >
          <div className="rounded-lg border border-slate-300 bg-white p-4 font-semibold">
            YOUR ORGANIZATION
            <p className="mt-1 text-xs font-normal text-slate-600">Complete data isolation, centralized governance</p>
          </div>
          <div
            className={`mt-4 rounded-lg border p-4 transition-colors ${hover === "ws" ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 bg-white"}`}
            onMouseEnter={() => setHover("ws")}
            role="presentation"
          >
            <p className="font-semibold">WORKSPACE LEVEL</p>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {["Product Team", "Client A", "Operations"].map((w) => (
                <div key={w} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-medium">
                  {w}
                  <div className="mt-1 text-[10px] font-normal text-slate-500">Workspace</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-indigo-700">Cross-Workspace Visibility</p>
          </div>
          <div
            className={`mt-4 rounded-lg border p-4 transition-colors ${hover === "proj" ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 bg-white"}`}
            onMouseEnter={() => setHover("proj")}
            role="presentation"
          >
            <p className="font-semibold">PROJECT LEVEL</p>
            <p className="mt-2 text-xs text-slate-600">
              Tasks • Phases • Gates • Resources • Risks • Documents
            </p>
          </div>
        </div>

        <blockquote className="mx-auto mt-10 max-w-3xl border-l-4 border-indigo-500 pl-6 text-lg italic text-slate-700">
          Start with one workspace and simple vertical projects. Add cross-workspace resource sharing, phase-gate governance, or portfolio dashboards when your complexity demands it—never migrate to a new tool.
        </blockquote>
      </div>
    </section>
  );
}

export function StagingUseCasesSection() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const cards = [
    {
      icon: LayoutGrid,
      title: "Manual Tracking",
      body: "Managing projects in shared files and documents? Import your data and automatically detect conflicts hidden in the rows.",
      cta: "Import & Analyze →",
      badge: "Most Popular",
      onCta: () => document.getElementById("template-center")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      icon: Kanban,
      title: "Basic Task Management",
      body: "Can see tasks but not how they connect across projects? Add cross-project visibility without losing simplicity.",
      cta: "Connect the Dots →",
      onCta: () => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      icon: Server,
      title: "Clunky Enterprise Tools",
      body: "Heavy platforms that slow down execution? Get enterprise governance with modern speed.",
      cta: "Modernize →",
      onCta: () => document.getElementById("resource-intelligence")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      icon: Rocket,
      title: "First Tool",
      body: "Need structure without complexity? Start with best-practice templates that scale.",
      cta: "Start Simple →",
      onCta: () => document.getElementById("template-center")?.scrollIntoView({ behavior: "smooth" }),
    },
  ];

  return (
    <section id="use-cases" className="bg-white px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
          However You&apos;re Managing Delivery Today...
        </h2>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <article
                key={c.title}
                className="relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm transition hover:shadow-md"
              >
                {c.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800">
                    {c.badge}
                  </span>
                )}
                <Icon className="h-10 w-10 text-indigo-600" />
                <h3 className="mt-4 text-lg font-bold text-slate-900">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">{c.body}</p>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="mt-4 text-left text-sm font-semibold text-indigo-600 hover:underline"
                >
                  {expanded === i ? "Hide details" : "Expand for template ideas"}
                </button>
                {expanded === i && (
                  <p className="mt-2 text-xs text-slate-600">
                    Try Simple Task Delivery, Agile Sprint, or Client Project templates—enable resource views when your team grows.
                  </p>
                )}
                <button
                  type="button"
                  onClick={c.onCta}
                  className="mt-4 text-sm font-semibold text-slate-900 hover:text-indigo-600"
                >
                  {c.cta}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const TEMPLATES = [
  { name: "Simple Task Delivery", desc: "Start here. Clean task management for small teams.", tier: "Simple" as const },
  { name: "Agile Sprint Management", desc: "Scrum ceremonies, velocity tracking, retrospectives.", tier: "Advanced" as const },
  { name: "Client Project Delivery", desc: "Agencies and consultancies. Time tracking, status reports, approvals.", tier: "Advanced" as const },
  { name: "Phase-Gate Process", desc: "Manufacturing and hardware. Stage gates with compliance trails.", tier: "Enterprise" as const },
  { name: "Product Roadmap", desc: "Software teams. Connect strategy to execution with dependency mapping.", tier: "Advanced" as const },
  { name: "Resource Planning", desc: "Services organizations. Capacity planning and utilization tracking.", tier: "Enterprise" as const },
];

const tierStyle = {
  Simple: "bg-green-100 text-green-900",
  Advanced: "bg-amber-100 text-amber-900",
  Enterprise: "bg-violet-100 text-violet-900",
};

export function StagingTemplateCenterSection() {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <section id="template-center" className="bg-indigo-50 px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-800">Start fast</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">Methodology-In-A-Box</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
          Pre-configured delivery frameworks with built-in automation—not blank slates requiring setup.
        </p>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <article
              key={t.name}
              className="group rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tierStyle[t.tier]}`}>
                  {t.tier}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 md:text-sm">{t.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreview(t.name)}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white opacity-90 transition group-hover:opacity-100"
                >
                  Use This Template
                </button>
              </div>
            </article>
          ))}
        </div>
        <blockquote className="mx-auto mt-12 max-w-3xl text-center text-lg text-slate-700">
          Every template includes optional automations—turn on what you need. Start with Simple Task Delivery, enable Resource Heatmaps when you hire your 10th person, add Phase-Gate governance when you need compliance.
        </blockquote>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="preview-title" className="text-lg font-bold text-slate-900">Template structure</h2>
            <p className="mt-2 text-sm text-slate-600">{preview}</p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Work breakdown &amp; default views</li>
              <li>Optional governance modules</li>
              <li>Automation hooks (enable per workspace)</li>
            </ul>
            <button type="button" className="mt-6 w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function StagingResourceIntelSection() {
  const [pct, setPct] = useState(88);
  return (
    <section id="resource-intelligence" className="bg-white px-8 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-5 lg:items-center">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Resource intelligence</p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-medium text-slate-800">Threshold preview (admin-configurable)</p>
            <input
              type="range"
              min={80}
              max={100}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="mt-4 w-full accent-indigo-600"
              aria-label="Base capacity percent"
            />
            <p className="mt-2 text-xs text-slate-600">Base capacity band: {pct}%–100%</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                <span className="font-medium text-green-900">80–100%</span>
                <span className="text-green-800">Healthy capacity</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <span className="font-medium text-amber-900">100–110%</span>
                <span className="text-amber-900">Managed stretch — justification</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                <span className="font-medium text-red-900">110%+</span>
                <span className="text-red-900">Critical — approval workflow</span>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Sarah — 120%</p>
              <p className="mt-1 text-xs">API Project 60% · Mobile Launch 50% · Admin 10%</p>
              <p className="mt-3 text-xs text-slate-600">
                Manager override: Approved for Q2 crunch. Mitigation: Contractor starting next week.
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              See Resource Heatmap Demo →
            </button>
          </div>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-3xl font-extrabold text-slate-900">Controlled Flexibility, Not Rigid Limits</h2>
          <p className="mt-4 text-slate-600">
            Most tools force a binary choice: block overallocation (unrealistic) or allow it silently (dangerous).
          </p>
          <p className="mt-4 font-medium text-slate-800">Zephix introduces intelligent thresholds:</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600">
            <li>80–100%: Standard capacity monitoring</li>
            <li>100–110%: Managed stretch with automatic justification logging</li>
            <li>110%+: Critical flag with mandatory approval workflows and mitigation tracking</li>
          </ul>
          <p className="mt-4 text-slate-600">
            Your team can strategically overallocate for critical deadlines, but now it&apos;s visible, justified, and approved—not hidden in spreadsheets.
          </p>
          <p className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950">
            <strong>Key capability:</strong> AI monitors patterns: &quot;Sarah is consistently overallocated this quarter. Recommend: Increase contractor budget or redistribute Mobile Launch to Mike.&quot;
          </p>
        </div>
      </div>
    </section>
  );
}

export function StagingContextualAISection() {
  const items = [
    {
      icon: UserCog,
      title: "Different Views for Different Roles",
      body: "Project Managers see task-level risk alerts. Program Managers see resource conflicts. Executives see portfolio health scores.",
    },
    {
      icon: MapPin,
      title: "Help Where You Need It",
      body: "On the Resource page? Get allocation advice. In the Risk Log? Get mitigation suggestions. Contextual, not generic.",
    },
    {
      icon: Activity,
      title: "Organizational Learning",
      body: "Projects similar to API Rewrite typically slip at Week 6 due to integration complexity. Consider buffer.",
    },
    {
      icon: Bot,
      title: "Automated Reporting",
      body: "Configure AI to generate weekly status reports, resource forecasts, or risk summaries—automatically delivered to stakeholders.",
    },
  ];
  return (
    <section className="bg-slate-50 px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-600">Delivery assistance</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">Context-Aware Intelligence</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
          AI that understands your role, your location in the platform, and your organization&apos;s delivery patterns.
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <article key={it.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <Icon className="h-10 w-10 text-indigo-600" aria-hidden />
                <h3 className="mt-4 text-lg font-bold text-slate-900">{it.title}</h3>
                <p className="mt-3 text-slate-600">{it.body}</p>
              </article>
            );
          })}
        </div>
        <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-slate-600">
          <strong>Note:</strong> AI features are rolling out to beta users. Core delivery management functions work entirely without AI.
        </p>
      </div>
    </section>
  );
}
