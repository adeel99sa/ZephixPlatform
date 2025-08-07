import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import EarlyAccessModal from '../components/modals/EarlyAccessModal';

const ZephixLandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'access' | 'demo'>('access');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleModalOpen = (type: 'access' | 'demo') => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-gray-900">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(156,146,172,0.1)_1px,transparent_0)] bg-[length:40px_40px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between p-8 max-w-4xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Zephix Co-pilot
          </span>
        </div>
        <div className="flex items-center space-x-8">
          <button 
            onClick={() => handleModalOpen('access')}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 pt-32 pb-24">
        <div className={`transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="text-center">
            
            {/* Tagline */}
            <div className="mb-8">
              <p className="text-sm uppercase tracking-wider text-gray-600">
                → RISE ABOVE THE NOISE • OWN YOUR CATEGORY ←
              </p>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight text-gray-900">
              Make your project management the obvious choice.
            </h1>
            
            {/* Supporting Text */}
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              We craft AI-powered project management solutions for enterprise teams—automating planning, 
              monitoring, and reporting so you can focus on strategic leadership.
            </p>
            
            {/* Section Label */}
            <div className="mb-12">
              <p className="text-sm uppercase tracking-wider text-gray-500">
                SEED & SERIES A
              </p>
            </div>
            
            {/* CTA Section */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={() => handleModalOpen('access')}
                className="group bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center space-x-3 shadow-lg"
              >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">M</span>
                </div>
                <div className="text-left">
                  <span>Book an intro call</span>
                  <p className="text-sm text-gray-300">Friendly chat, no pressure</p>
                </div>
              </button>
              <button 
                onClick={() => handleModalOpen('demo')}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Explore our work
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-4xl mx-auto px-8 py-16 text-center">
        <p className="text-sm text-gray-500">
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
