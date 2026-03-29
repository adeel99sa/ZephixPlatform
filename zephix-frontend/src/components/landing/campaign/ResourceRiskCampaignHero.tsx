import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import { demoPathForCampaign, RESOURCE_RISK_CAMPAIGN_SLUG } from "./resource-risk-constants";
import { ResourceRiskCampaignPreview } from "./ResourceRiskCampaignPreview";

export function ResourceRiskCampaignHero(): ReactElement {
  const demoHref = demoPathForCampaign(RESOURCE_RISK_CAMPAIGN_SLUG);

  return (
    <section
      data-section="hero"
      data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
      className="border-b border-slate-200 bg-slate-50"
      aria-labelledby="campaign-resource-risk-hero-heading"
    >
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-800 shadow-sm">
              {"Resource & cascade intelligence"}
            </p>
            <h1
              id="campaign-resource-risk-hero-heading"
              className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]"
            >
              See Every Conflict Before It Cascades.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Identify resource overload, hidden dependencies, and execution risks before they
              impact delivery.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Powered by a system that connects resources, dependencies, and governance in real time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={demoHref}
                data-cta="demo-request"
                data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Request Demo
              </Link>
              <Link
                to="/signup"
                data-cta="trial-signup"
                data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
              >
                Start Free Trial
              </Link>
            </div>
            <p className="mt-8 text-sm text-slate-500">
              Problem-led view — Zephix connects this signal to governed execution on the platform.
            </p>
          </div>
          <div>
            <ResourceRiskCampaignPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
