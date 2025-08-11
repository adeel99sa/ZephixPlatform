import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

interface HeroSectionProps {
  onDemoRequest: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDemoRequest }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleDemoRequest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDemoRequest();
  };

  const handleSampleBRD = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // For now, also trigger demo request
    onDemoRequest();
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:44px_44px]"></div>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-24 pb-16">
        <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Trust row */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">SSO</div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">RBAC</div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Audit logs</div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Encryption at rest and in transit</div>
            </div>
            
            {/* Main headline */}
            <h1 className="text-[56px] font-bold text-white mb-6 leading-tight">
              Turn a BRD into a project plan in 3 minutes.
            </h1>
            
            {/* Sub-headline */}
            <p className="text-[20px] text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0 opacity-60">
              Upload a BRD. Zephix extracts scope, builds a schedule with stage gates, and prepares an executive one pager.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <button 
                onClick={handleSampleBRD}
                className="bg-white text-gray-900 px-8 h-12 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-colors hover:scale-105 transform"
              >
                Try a sample BRD
              </button>
              <button 
                onClick={handleDemoRequest}
                className="border-2 border-white text-white px-8 h-12 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors hover:scale-105 transform"
              >
                Book a 15 minute demo
              </button>
            </div>
          </div>
          
          {/* Right Column - 12 second silent video */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              <div className="aspect-video bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <Play className="w-16 h-16 mx-auto mb-4" />
                  <div className="text-lg font-medium">12s Demo Video</div>
                  <div className="text-sm">Autoplay • Loop • No controls</div>
                  <div className="text-xs mt-2">Captions on by default</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
