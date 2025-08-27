import React from 'react';
import Navigation from '../components/landing/Navigation';
import Hero from '../components/landing/Hero';
import ProblemSection from '../components/landing/ProblemSection';
import SolutionsSection from '../components/landing/SolutionsSection';
import VisionSection from '../components/landing/SolutionCards';
import Timeline from '../components/landing/Timeline';
import FounderStory from '../components/landing/FounderStory';
import FAQ from '../components/landing/FAQ';
import CTASection from '../components/landing/CTASection';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-white">
      <Navigation />
      <Hero />
      <ProblemSection />
      <SolutionsSection />
      <VisionSection />
      <Timeline />
      <FounderStory />
      <FAQ />
      <CTASection />
    </div>
  );
};

export default LandingPage;