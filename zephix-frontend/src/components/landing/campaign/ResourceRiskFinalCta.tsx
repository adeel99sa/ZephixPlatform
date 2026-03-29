import type { ReactElement } from "react";

import { CampaignDualCta } from "./shared";
import { RESOURCE_RISK_CAMPAIGN_SLUG } from "./resource-risk-constants";

export function ResourceRiskFinalCta(): ReactElement {
  return (
    <CampaignDualCta
      sectionId="campaign-resource-risk-final-cta"
      title="See it on your portfolio"
      description="Walk through resource pressure, dependencies, and governance in one session."
      campaignSlug={RESOURCE_RISK_CAMPAIGN_SLUG}
    />
  );
}
