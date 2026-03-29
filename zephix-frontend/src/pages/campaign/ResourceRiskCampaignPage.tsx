import type { ReactElement } from "react";

import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/v3/LandingFooter";
import {
  ResourceRiskCampaignHero,
  ResourceRiskFinalCta,
  ResourceRiskGovernanceBridge,
  ResourceRiskPillarsSection,
  ResourceRiskProblemSection,
  ResourceRiskSystemSection,
} from "@/components/landing/campaign";

/**
 * Public demand-gen campaign: problem-first resource & cascade narrative.
 * Canonical homepage (`/`) remains V3 — this route is an alternate positioning surface only.
 */
export default function ResourceRiskCampaignPage(): ReactElement {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <LandingNavbar />
      <main data-campaign="resource-risk">
        <ResourceRiskCampaignHero />
        <ResourceRiskProblemSection />
        <ResourceRiskSystemSection />
        <ResourceRiskPillarsSection />
        <ResourceRiskGovernanceBridge />
        <ResourceRiskFinalCta />
      </main>
      <LandingFooter homeHashLinks />
    </div>
  );
}
