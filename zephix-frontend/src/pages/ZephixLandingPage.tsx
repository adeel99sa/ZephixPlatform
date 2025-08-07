import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import EarlyAccessModal from '../components/modals/EarlyAccessModal';
import { HeroSection } from '../components/landing/HeroSection';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';

const ZephixLandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'access' | 'demo'>('access');
  const [isPublicDomain, setIsPublicDomain] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Force cache bust for CSS
    
    // Check URL parameters for testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceComingSoon = urlParams.get('coming-soon') === 'true';
    
    // Check if we're on a public domain (not Railway)
    const hostname = window.location.hostname;
    console.log('Current hostname:', hostname); // Debug log
    
    // More comprehensive Railway domain detection
    const isRailwayDomain = hostname.includes('railway.app') || 
                           hostname.includes('localhost') || 
                           hostname.includes('127.0.0.1') ||
                           hostname.includes('railway');
    
    console.log('Is Railway domain:', isRailwayDomain); // Debug log
    console.log('Force coming soon:', forceComingSoon); // Debug log
    
    // Show coming soon if forced via URL or if not on Railway domain
    setIsPublicDomain(forceComingSoon || !isRailwayDomain);
  }, []);

  const handleModalOpen = (type: 'access' | 'demo') => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  // Coming Soon page for public domains
  if (isPublicDomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-3 mb-12">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">Zephix</div>
                <div className="text-sm text-slate-400 leading-none">Co-pilot</div>
              </div>
            </div>

            {/* Coming Soon Content */}
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-6 py-3 mb-8">
                <Zap className="w-5 h-5 text-indigo-400" />
                <span className="text-sm text-indigo-300">Coming Soon</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                  Something
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Amazing
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Is Coming
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed max-w-3xl mx-auto">
                We're building the future of AI-powered project management. 
                <span className="text-white font-semibold"> Get ready to transform how you lead projects.</span>
              </p>

              {/* Progress indicator */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-12 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-4">Development Progress</div>
                  <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000" style={{ width: '75%' }}></div>
                  </div>
                  <div className="text-slate-400 text-sm">75% Complete</div>
                </div>
              </div>

              {/* Email signup */}
              <div className="max-w-md mx-auto">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Be the First to Know</h3>
                  <p className="text-slate-300 text-sm mb-6">Get early access when we launch</p>
                  
                  <div className="flex space-x-3">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
                      Notify Me
                    </button>
                  </div>
                </div>
              </div>

              {/* Social links */}
              <div className="mt-12">
                <p className="text-slate-400 text-sm mb-4">Follow our journey</p>
                <div className="flex items-center justify-center space-x-6">
                  <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">LinkedIn</div>
                  <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Twitter</div>
                  <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Blog</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 max-w-7xl mx-auto px-8 py-16 text-center">
          <p className="text-sm text-slate-400">
            © 2024 Zephix Co-pilot. All rights reserved.
          </p>
        </footer>
      </div>
    );
  }

  // Full landing page for Railway domains
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <LandingNavbar />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-8 py-16 text-center">
        <p className="text-sm text-slate-400">
          First impressions are everything. Let's get yours right.
        </p>
      </footer>
      
      <EarlyAccessModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        type={modalType}
      />
    </div>
  );
};

export default ZephixLandingPage;
