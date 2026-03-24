import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How is this different from traditional project management tools?",
    a: "Traditional tools were designed for task lists. Zephix is designed for delivery orchestration—seeing how tasks, resources, and timelines interact across multiple projects. We detect the conflicts they miss.",
  },
  {
    q: "Do I have to use all the features?",
    a: "No. Start with simple task management. Enable resource intelligence when you add your 10th team member. Add phase-gate governance when you need compliance. The architecture scales; you choose when to use each layer.",
  },
  {
    q: "Can I import from my current system?",
    a: "Yes. Import from any CSV, spreadsheet, or standard project export. We automatically map your data and begin detecting conflicts within minutes.",
  },
  {
    q: "Is my data secure?",
    a: "Organization-scoped data isolation with encrypted storage. SOC 2 Type II in progress. GDPR compliant. You can export or delete your data anytime.",
  },
  {
    q: "What if my team is only 5 people?",
    a: "The Q2 beta cohort is limited (50 spots). Small teams are welcome—use the waitlist to reserve. Free-tier limits for GA will be confirmed before Q3 public launch.",
  },
  {
    q: "How does the AI work?",
    a: "AI is optional assistance, not required functionality. It analyzes patterns in your delivery data to suggest risks or automate reports. You control what it accesses and when it runs.",
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function StagingPricingSection() {
  return (
    <section id="pricing" className="bg-white px-8 py-24">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-600">Pricing</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">Simple Scaling</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
          Target GA pricing below (Q3 2026). Beta cohort (Q2) uses waitlist—founding terms may differ.
        </p>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Professional</h3>
            <p className="mt-4">
              <span className="text-4xl font-extrabold text-slate-900">$20</span>
              <span className="text-slate-600"> / user / month</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">billed annually (or $24 monthly)</p>
            <p className="mt-4 text-slate-600">
              For delivery teams managing multiple projects with cross-functional visibility needs.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>✓ Unlimited projects and workspaces</li>
              <li>✓ Resource intelligence (80–120% thresholds)</li>
              <li>✓ Template library access</li>
              <li>✓ Standard integrations</li>
              <li>✓ Email support</li>
            </ul>
            <button
              type="button"
              onClick={() => scrollToId("waitlist")}
              className="mt-8 w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Join Q2 Beta Waitlist
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Beta opens Q2 2026 — no card to reserve a spot.</p>
          </article>
          <article className="rounded-2xl border-2 border-indigo-200 bg-white p-8 shadow-md">
            <h3 className="text-xl font-bold text-slate-900">Business</h3>
            <p className="mt-4">
              <span className="text-4xl font-extrabold text-slate-900">$35</span>
              <span className="text-slate-600"> / user / month</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">billed annually (or $42 monthly)</p>
            <p className="mt-4 text-slate-600">
              For organizations requiring governance, compliance, and advanced automation.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">Everything in Professional, plus:</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>✓ Advanced AI agents and automated reporting</li>
              <li>✓ Phase-gate governance workflows</li>
              <li>✓ SSO/SAML authentication</li>
              <li>✓ Audit logs and compliance exports</li>
              <li>✓ 110%+ allocation approval chains</li>
              <li>✓ Priority support</li>
            </ul>
            <button
              type="button"
              onClick={() => scrollToId("waitlist")}
              className="mt-8 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Contact Sales for Pilot
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">30-day pilot program available.</p>
          </article>
        </div>
        <p className="mt-12 text-center text-sm text-slate-600">
          Planned free tier (GA): up to 3 users, 2 workspaces, basic templates—subject to change; we&apos;ll confirm before Q3 self-serve.
        </p>
      </div>
    </section>
  );
}

export function StagingFAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-slate-50 px-8 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-extrabold text-slate-900">FAQ</h2>
        <div className="mt-10 space-y-2">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold text-slate-900 md:text-base"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {item.q}
                  <span className="ml-2 text-indigo-600">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-2 text-sm text-slate-600">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function StagingFinalCTASection() {
  return (
    <section id="waitlist" className="bg-indigo-600 px-8 py-24 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Ready to stop managing delivery in spreadsheets?</h2>
        <p className="mt-4 text-lg text-indigo-100">
          Join the Q2 2026 beta cohort. <strong className="font-semibold text-white">50 spots</strong> available. No credit card required to join the waitlist.
        </p>
        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <label htmlFor="staging-waitlist-email" className="sr-only">
            Email
          </label>
          <input
            id="staging-waitlist-email"
            type="email"
            required
            placeholder="Work email"
            className="min-h-[48px] w-full rounded-lg border-0 px-4 text-slate-900 shadow-sm sm:max-w-xs"
          />
          <button
            type="submit"
            className="min-h-[48px] rounded-lg bg-white px-6 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            Join Q2 Beta Waitlist
          </button>
        </form>
        <p className="mt-6 text-sm text-indigo-200">
          Founding members: lifetime pricing at 50% off when we launch paid tiers. Help shape the product before public GA (Q3).
        </p>
      </div>
    </section>
  );
}

export function StagingMarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-8 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Zap className="h-5 w-5" />
          </span>
          ZEPHIX
        </div>
        <p className="mt-2 text-sm text-slate-600">Delivery Intelligence Platform</p>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Product</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("roadmap")}>Roadmap</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("platform")}>Overview</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("platform")}>Workspaces</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("resource-intelligence")}>Resource Intel</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("template-center")}>Template Center</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Methodology</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("template-center")}>Agile Delivery</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("template-center")}>Waterfall / Phase</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("template-center")}>Hybrid Models</button></li>
              <li><button type="button" className="hover:text-indigo-600" onClick={() => scrollToId("use-cases")}>Use Cases</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Legal</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li><span className="text-slate-400">Privacy Policy</span> <span className="text-xs">(staging placeholder)</span></li>
              <li><span className="text-slate-400">Terms of Service</span> <span className="text-xs">(staging placeholder)</span></li>
              <li><span className="text-slate-400">Security Overview</span> <span className="text-xs">(staging placeholder)</span></li>
              <li><span className="text-slate-400">Cookie Settings</span> <span className="text-xs">(staging placeholder)</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-8 text-xs text-slate-500">
          <span>System Status: Operational</span>
          <span>© 2026 Zephix, Inc.</span>
        </div>
      </div>
    </footer>
  );
}
