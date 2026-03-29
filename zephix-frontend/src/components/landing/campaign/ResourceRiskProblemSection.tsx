import type { ReactElement } from "react";

import { CampaignProblemGrid } from "./shared";
import { RESOURCE_RISK_CAMPAIGN_SLUG } from "./resource-risk-constants";

const POINTS = [
  "Hidden dependencies across teams and tools",
  "Overallocated resources competing on the same window",
  "Delayed visibility until slips show up in status reports",
] as const;

export function ResourceRiskProblemSection(): ReactElement {
  return (
    <CampaignProblemGrid
      sectionId="campaign-resource-risk-problem"
      heading="Why projects fail at scale"
      points={POINTS}
      campaignSlug={RESOURCE_RISK_CAMPAIGN_SLUG}
    />
  );
}
