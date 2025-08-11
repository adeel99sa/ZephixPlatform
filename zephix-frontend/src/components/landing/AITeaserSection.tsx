import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, FileText, Clock, DollarSign, Users, Rocket } from 'lucide-react';

export const AITeaserSection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCTAClick = () => {
    // Track analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'Demo',
        event_label: 'Landing Page AI Teaser CTA',
        value: 1
      });
    }
    
    // Navigate to AI Theater
    navigate('/sample-brd');
  };

  return (
    <section className="ai-teaser-section pt-0 pb-16 px-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className={`teaser-container max-w-4xl mx-auto relative z-10 transition-all duration-1000 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}>
        {/* AI Brain Icon with animation */}
        <div className="ai-brain-icon text-center mb-6">
          <div className="inline-block p-4 bg-white/10 rounded-full backdrop-blur-sm animate-pulse-glow">
            <Brain className="w-16 h-16 text-white" />
          </div>
        </div>
        
        {/* Compelling headline */}
        <h2 className="teaser-headline text-4xl md:text-5xl font-bold text-center mb-4 leading-tight">
          Watch AI Transform Project Planning
        </h2>
        
        {/* Subheadline with value prop */}
        <p className="teaser-subheadline text-xl text-center mb-8 opacity-90 max-w-2xl mx-auto">
          Upload your BRD or try our enterprise sample below. See AI generate an intelligent project plan in 60 seconds.
        </p>
        
        {/* Enterprise sample preview card */}
        <div className="enterprise-preview-card bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
          <div className="preview-header flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-white" />
            <span className="text-lg font-semibold">Enterprise Sample: Legacy System Data Migration</span>
          </div>
          <div className="preview-stats grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-white/70" />
                <span className="stat-label text-sm opacity-80">Document Size:</span>
              </div>
              <span className="stat-value text-xl font-bold">47 pages</span>
            </div>
            <div className="stat bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-white/70" />
                <span className="stat-label text-sm opacity-80">Project Budget:</span>
              </div>
              <span className="stat-value text-xl font-bold">$150,000</span>
            </div>
            <div className="stat bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-white/70" />
                <span className="stat-label text-sm opacity-80">Team Size:</span>
              </div>
              <span className="stat-value text-xl font-bold">6 members</span>
            </div>
          </div>
        </div>
        
        {/* Primary CTA button */}
        <div className="text-center mb-6">
          <button 
            className="primary-cta-button bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-3xl inline-flex items-center gap-3"
            onClick={handleCTAClick}
          >
            <Rocket className="w-6 h-6" />
            See AI Generate Plan in 60 Seconds
          </button>
        </div>
        
        {/* Trust signals */}
        <div className="trust-signals flex flex-wrap items-center justify-center gap-4 text-sm opacity-80">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            No signup required
          </span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Real enterprise data
          </span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            See results instantly
          </span>
        </div>
        
        {/* Enterprise Security Features */}
        <div className="security-badges mt-12 pt-8 border-t border-white/20">
          <p className="text-center text-sm text-white/80 mb-4">Enterprise-grade security built in</p>
          <div className="flex flex-wrap justify-center gap-2">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium text-white/90">SSO</div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium text-white/90">RBAC</div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium text-white/90">Audit logs</div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium text-white/90">Encryption at rest and in transit</div>
          </div>
        </div>
      </div>
    </section>
  );
};