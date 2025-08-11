import React, { useState, memo } from 'react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { AITeaserSection } from '../components/landing/AITeaserSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { AboutSection } from '../components/landing/AboutSection';
import { PricingSection } from '../components/landing/PricingSection';
import { Footer } from '../components/landing/Footer';
import { DemoRequestModal } from '../components/modals/DemoRequestModal';
import { ContactModal } from '../components/modals/ContactModal';

interface LandingPageProps {}

export const LandingPage: React.FC<LandingPageProps> = memo(() => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleDemoRequest = () => {
    setIsDemoModalOpen(true);
  };

  const handleContactRequest = () => {
    setIsContactModalOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn('Section not found:', sectionId);
    }
  };

  return (
    <div className="font-sans text-gray-900 antialiased">
      <Header 
        onDemoRequest={handleDemoRequest}
        onContactRequest={handleContactRequest}
        onScrollToSection={scrollToSection}
      />
      
      <main>
        <HeroSection onDemoRequest={handleDemoRequest} />
        <AITeaserSection />
        <ProblemSection />
        <FeaturesSection onScrollToSection={scrollToSection} />
        <HowItWorksSection />
        <AboutSection />
        <PricingSection onDemoRequest={handleDemoRequest} />
      </main>

      <Footer 
        onScrollToSection={scrollToSection}
        onContactRequest={handleContactRequest}
      />

      <DemoRequestModal 
        isOpen={isDemoModalOpen}
        onClose={() => {
          console.log('Closing demo modal');
          setIsDemoModalOpen(false);
        }}
      />

      <ContactModal 
        isOpen={isContactModalOpen}
        onClose={() => {
          console.log('Closing contact modal');
          setIsContactModalOpen(false);
        }}
      />
    </div>
  );
});

LandingPage.displayName = 'LandingPage';
