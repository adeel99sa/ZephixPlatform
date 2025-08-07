import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import EarlyAccessModal from '../components/modals/EarlyAccessModal';
import { HeroSection } from '../components/landing/HeroSection';
import { LandingNavbar } from '../components/landing/LandingNavbar';

const ZephixLandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'access' | 'demo'>('access');

  useEffect(() => {
    setIsVisible(true);
    // Force cache bust for CSS
  }, []);

  const handleModalOpen = (type: 'access' | 'demo') => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <LandingNavbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-8 py-16 text-center">
        <p className="text-sm text-slate-400">
          First impressions are everything. Let's get yours right.
        </p>
      </footer>

      {/* Modal */}
      <EarlyAccessModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        type={modalType}
      />
    </div>
  );
};

export default ZephixLandingPage;
