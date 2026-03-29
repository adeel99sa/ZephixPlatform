import type { ReactElement } from "react";
import { Link } from "react-router-dom";

export type CampaignDualCtaProps = {
  sectionId: string;
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Primary goes to /demo with optional query */
  demoPath?: string;
  secondaryTo?: string;
  campaignSlug?: string;
};

/**
 * Shared closing CTA block: demo route (tracked) + trial signup.
 */
export function CampaignDualCta({
  sectionId,
  title,
  description,
  primaryLabel = "Request Demo",
  secondaryLabel = "Start Free Trial",
  demoPath = "/demo",
  secondaryTo = "/signup",
  campaignSlug,
}: CampaignDualCtaProps): ReactElement {
  const demoHref =
    campaignSlug && campaignSlug.length > 0
      ? `${demoPath}?campaign=${encodeURIComponent(campaignSlug)}`
      : demoPath;

  return (
    <section
      id={sectionId}
      data-section="final-cta"
      data-campaign={campaignSlug}
      className="bg-white py-16 sm:py-20"
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          id={`${sectionId}-heading`}
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-slate-600">{description}</p>
        ) : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={demoHref}
            data-cta="demo-request"
            data-campaign={campaignSlug}
            className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 sm:w-auto"
          >
            {primaryLabel}
          </Link>
          <Link
            to={secondaryTo}
            data-cta="trial-signup"
            data-campaign={campaignSlug}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
