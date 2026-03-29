import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import { LandingHeroPreview } from "./LandingHeroPreview";

export function LandingHero(): ReactElement {
  return (
    <section
      className="border-b border-slate-200 bg-slate-50"
      aria-labelledby="landing-hero-heading"
    >
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-800 shadow-sm">
              New: Native Governance Engine for Project Delivery
            </p>
            <h1
              id="landing-hero-heading"
              className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]"
            >
              The Operating System for Enterprise Project Delivery.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Deliver projects within capacity, budget, and control.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/demo?campaign=homepage-v3"
                data-cta="demo-request"
                data-campaign="homepage-v3"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Request Demo
              </Link>
              <Link
                to="/signup"
                data-cta="trial-signup"
                data-campaign="homepage-v3"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
              >
                Start Free Trial
              </Link>
            </div>
            <p className="mt-8 text-sm text-slate-500">
              Built for delivery organizations that need more than task tracking.
            </p>
          </div>
          <div>
            <LandingHeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
