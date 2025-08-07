import React, { memo } from 'react';
import { LandingNavbar, HeroSection, FeaturesSection, HowItWorksSection, PricingSection } from '../components/landing';

interface LandingPageProps {}

export const LandingPage: React.FC<LandingPageProps> = memo(() => {
  return (
    <div className="font-sans text-gray-900 antialiased">
      <LandingNavbar />
      <main className="pt-20">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
      </main>
    </div>
  );
});

LandingPage.displayName = 'LandingPage';
