import type { ReactElement } from "react";

export type CampaignProblemGridProps = {
  /** Stable id for analytics / anchors */
  sectionId: string;
  heading: string;
  points: readonly string[];
  /** e.g. resource-risk — surfaces on section for data-campaign */
  campaignSlug?: string;
};

/**
 * Shared problem strip: headline + equal cards (campaign landing pattern).
 */
export function CampaignProblemGrid({
  sectionId,
  heading,
  points,
  campaignSlug,
}: CampaignProblemGridProps): ReactElement {
  return (
    <section
      id={sectionId}
      data-section="problem"
      data-campaign={campaignSlug}
      className="border-b border-slate-200 bg-white py-16 sm:py-20"
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id={`${sectionId}-heading`}
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {heading}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {points.map((text) => (
            <li
              key={text}
              className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-medium leading-snug text-slate-800"
            >
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
