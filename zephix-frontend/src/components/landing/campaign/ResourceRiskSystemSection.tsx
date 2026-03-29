import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import { RESOURCE_RISK_CAMPAIGN_SLUG } from "./resource-risk-constants";

export function ResourceRiskSystemSection(): ReactElement {
  return (
    <section
      data-section="system"
      data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
      className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
      aria-labelledby="campaign-system-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="campaign-system-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          From isolated tasks to connected execution
        </h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600">
          Tasks → resources → risks → impact. When those layers stay separate, collisions surface
          late. Zephix connects them so downstream pressure is visible before the slip hits the
          milestone.
        </p>
        <p className="mt-4 text-sm font-medium text-slate-700">
          <Link
            to="/"
            data-cta="platform-home"
            data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
            className="text-indigo-600 underline-offset-4 hover:underline"
          >
            See how the full platform positions execution
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
