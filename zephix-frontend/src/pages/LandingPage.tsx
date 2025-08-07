import React, { useState, memo } from 'react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { PricingSection } from '../components/landing/PricingSection';
import { AboutSection } from '../components/landing/AboutSection';
import { Footer } from '../components/landing/Footer';
import { DemoRequestModal } from '../components/modals/DemoRequestModal';
import { ContactModal } from '../components/modals/ContactModal';

interface LandingPageProps {}

export const LandingPage: React.FC<LandingPageProps> = memo(() => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleDemoRequest = () => {
    console.log('LandingPage: handleDemoRequest called');
    console.log('Current isDemoModalOpen state:', isDemoModalOpen);
    setIsDemoModalOpen(true);
    console.log('Setting isDemoModalOpen to true');
  };

  const handleContactRequest = () => {
    console.log('LandingPage: handleContactRequest called');
    setIsContactModalOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    console.log('Scrolling to section:', sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn('Section not found:', sectionId);
    }
  };

  // Debug modal state
  console.log('LandingPage render - isDemoModalOpen:', isDemoModalOpen);
  console.log('LandingPage render - isContactModalOpen:', isContactModalOpen);

  return (
    <div className="font-sans text-gray-900 antialiased">
      <Header 
        onDemoRequest={handleDemoRequest}
        onContactRequest={handleContactRequest}
        onScrollToSection={scrollToSection}
      />
      
      <main>
        <HeroSection onDemoRequest={handleDemoRequest} />
        <ProblemSection />
        <FeaturesSection onScrollToSection={scrollToSection} />
        <PricingSection onDemoRequest={handleDemoRequest} />
        <AboutSection />
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
