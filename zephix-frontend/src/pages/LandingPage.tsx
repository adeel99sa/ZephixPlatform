import React from "react";

import { LandingNavbar } from "../components/landing/LandingNavbar";
import {
  LandingArchitecture,
  LandingBridge,
  LandingEngines,
  LandingFooter,
  LandingHero,
  LandingRoadmap,
} from "../components/landing/v3";

/**
 * Canonical public marketing landing (guests at `/`).
 *
 * V3 sections under `components/landing/v3` are the active, production-intended surface.
 * Pre-V3 sections live under `components/landing/legacy` for reference only — not routed here.
 */
const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingBridge />
        <LandingEngines />
        <LandingArchitecture />
        <LandingRoadmap />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
