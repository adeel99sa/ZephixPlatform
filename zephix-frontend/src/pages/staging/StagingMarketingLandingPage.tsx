import React from "react";
import { StagingMarketingNav } from "@/components/staging-marketing/StagingMarketingNav";
import { StagingMarketingHero } from "@/components/staging-marketing/StagingMarketingHero";
import {
  StagingContextualAISection,
  StagingPlatformSection,
  StagingResourceIntelSection,
  StagingTemplateCenterSection,
  StagingUseCasesSection,
  StagingVisibilityGap,
} from "@/components/staging-marketing/StagingMarketingMiddle";
import {
  StagingBuildingInPublicSection,
  StagingRoadmapSection,
} from "@/components/staging-marketing/StagingRoadmapSections";
import {
  StagingFAQSection,
  StagingFinalCTASection,
  StagingMarketingFooter,
  StagingPricingSection,
} from "@/components/staging-marketing/StagingMarketingFooter";

/**
 * Pre-MVP anonymous marketing landing (full copy).
 * Rendered for guests on "/" only when `isStagingMarketingLandingEnabled()` is true
 * (staging Railway: VITE_STAGING_MARKETING_LANDING=true).
 */
export default function StagingMarketingLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <StagingMarketingNav />
      <main>
        <StagingMarketingHero />
        <StagingVisibilityGap />
        <StagingPlatformSection />
        <StagingRoadmapSection />
        <StagingBuildingInPublicSection />
        <StagingUseCasesSection />
        <StagingTemplateCenterSection />
        <StagingResourceIntelSection />
        <StagingContextualAISection />
        <StagingPricingSection />
        <StagingFAQSection />
        <StagingFinalCTASection />
      </main>
      <StagingMarketingFooter />
    </div>
  );
}
