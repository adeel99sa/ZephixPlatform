import React, { useState, useEffect } from 'react';
import { Zap, ArrowRight, Play, Target, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../ui/StatusBadge';

interface HeroSectionProps {
  onDemoRequest: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDemoRequest }) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

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
    
    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'Hero CTA',
        event_label: 'Try a sample BRD',
        value: 1
      });
    }
    
    // Navigate to sample BRD flow in the same window
    navigate('/sample-brd');
  };

  return (
    <section id="hero" className="relative hero-bg overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-4">
        <div className={`text-center transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Private Beta Badge */}
          <div className="mb-3">
            <StatusBadge onDark={true} />
          </div>
          
          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">SSO</div>
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">RBAC</div>
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Audit logs</div>
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Encryption at rest and in transit</div>
          </div>
          
          {/* Main headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight max-w-4xl mx-auto">
            Turn a BRD into a project plan in 3 minutes.
          </h1>
          
          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            AI-powered project management that transforms your business requirements into actionable plans instantly.
          </p>
          
          {/* Proof blurb */}
          <p className="text-sm text-slate-300 opacity-80 max-w-2xl mx-auto">
            Time to first plan under 3 minutes in internal tests. Details in Changelog.
          </p>
          
          {/* Video placeholder - centered below content */}
          <div className="mt-12 flex justify-center">
            <div className="relative w-full max-w-2xl">
              <div className="aspect-video bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <Play className="w-16 h-16 mx-auto mb-4" />
                  <div className="text-lg font-medium">Short Product Video</div>
                  <div className="text-sm">BRD to plan in under 12 seconds</div>
                  <div className="text-xs mt-2">Autoplay • Loop • No controls</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleSampleBRD}
              className="btn-primary px-8 py-4 bg-white text-indigo-600 hover:bg-gray-100 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <FileText className="inline-block w-5 h-5 mr-2" />
              Try a sample BRD
            </button>
            <button 
              onClick={handleDemoRequest}
              className="btn-secondary px-8 py-4 bg-transparent text-white border-2 border-white/30 hover:bg-white/10 rounded-xl font-semibold text-lg transition-all duration-200"
            >
              <ArrowRight className="inline-block w-5 h-5 mr-2" />
              Book a 15 minute demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
