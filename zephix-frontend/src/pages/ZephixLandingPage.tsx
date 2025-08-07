import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import EarlyAccessModal from '../components/modals/EarlyAccessModal';
import { HeroSection } from '../components/landing/HeroSection';

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
      <nav className="relative z-50 flex items-center justify-between p-8 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">
            Zephix Co-pilot
          </span>
        </div>
        <div className="flex items-center space-x-8">
          <button 
            onClick={() => handleModalOpen('access')}
            className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:bg-white/20"
          >
            Request Access
          </button>
        </div>
      </nav>

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
