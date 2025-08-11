import React, { useState, memo } from 'react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { OutcomesSection } from '../components/landing/OutcomesSection';
import { SolutionsSection } from '../components/landing/SolutionsSection';
import { PricingSection } from '../components/landing/PricingSection';
import { SecuritySection } from '../components/landing/SecuritySection';
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
        <OutcomesSection />
        <ProblemSection />
        <FeaturesSection onScrollToSection={scrollToSection} />
        <SolutionsSection />
        <PricingSection onDemoRequest={handleDemoRequest} />
        <SecuritySection />
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
