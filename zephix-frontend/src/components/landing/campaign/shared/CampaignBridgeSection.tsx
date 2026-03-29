import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";

export type CampaignBridgeSectionProps = {
  sectionId: string;
  headline: string;
  children: ReactNode;
  link?: { to: string; label: string };
  campaignSlug?: string;
};

/**
 * Dark governance / positioning bridge — reuse across campaign pages.
 */
export function CampaignBridgeSection({
  sectionId,
  headline,
  children,
  link,
  campaignSlug,
}: CampaignBridgeSectionProps): ReactElement {
  return (
    <section
      id={sectionId}
      data-section="governance-bridge"
      data-campaign={campaignSlug}
      className="border-b border-slate-800 bg-slate-950 py-16 text-slate-100 sm:py-20"
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id={`${sectionId}-heading`}
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {headline}
        </h2>
        <div className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300">
          {children}
        </div>
        {link ? (
          <p className="mt-6 text-sm font-medium text-white">
            <Link
              to={link.to}
              data-cta="engines-home-link"
              data-campaign={campaignSlug}
              className="text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline"
            >
              {link.label}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
