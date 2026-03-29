import type { ReactElement } from "react";

import { CampaignBridgeSection } from "./shared";
import { RESOURCE_RISK_CAMPAIGN_SLUG } from "./resource-risk-constants";

export function ResourceRiskGovernanceBridge(): ReactElement {
  return (
    <CampaignBridgeSection
      sectionId="campaign-governance-bridge"
      headline="This only works because governance is built into execution."
      campaignSlug={RESOURCE_RISK_CAMPAIGN_SLUG}
      link={{
        to: "/#engines",
        label: "Explore the five native engines on the homepage",
      }}
    >
      <p>
        Conflict and cascade signals matter because governance, capacity, and execution live in one
        system — approvals, gates, and auditability are tied to the same graph of work and
        resources. This is not a standalone risk widget layered on static plans.
      </p>
    </CampaignBridgeSection>
  );
}
