import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, FileText, Clock, DollarSign, Users, Rocket, Building2, Factory, Home } from 'lucide-react';

export const AITeaserSection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState(0);

  const sampleProjects = [
    {
      title: 'Legacy System Data Migration',
      icon: FileText,
      industry: 'Enterprise',
      description: 'Complex enterprise migration project'
    },
    {
      title: 'Digital Banking Platform',
      icon: Building2,
      industry: 'Banking',
      description: 'Full-scale banking transformation'
    },
    {
      title: 'Smart Factory Implementation',
      icon: Factory,
      industry: 'Manufacturing',
      description: 'Industry 4.0 automation project'
    },
    {
      title: 'Property Management System',
      icon: Home,
      industry: 'Real Estate',
      description: 'End-to-end property platform'
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    // Rotate through samples
    const interval = setInterval(() => {
      setSelectedSample((prev) => (prev + 1) % sampleProjects.length);
    }, 5000);
    return () => clearInterval(interval);
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

  const currentSample = sampleProjects[selectedSample];
  const CurrentIcon = currentSample.icon;

  return (
    <section className="ai-teaser-section pt-0 pb-16 px-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className={`teaser-container max-w-4xl mx-auto relative z-10 pt-8 transition-all duration-1000 ${
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
          Upload your BRD or explore our enterprise samples below. Experience AI-powered intelligent project planning.
        </p>
        
        {/* Sample selector */}
        <div className="sample-selector flex flex-wrap justify-center gap-2 mb-6">
          {sampleProjects.map((sample, index) => (
            <button
              key={index}
              onClick={() => setSelectedSample(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedSample === index
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              {sample.industry}
            </button>
          ))}
        </div>
        
        {/* Enterprise sample preview card */}
        <div className="enterprise-preview-card bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
          <div className="preview-header flex items-center gap-3 mb-4">
            <CurrentIcon className="w-6 h-6 text-white" />
            <div>
              <span className="text-lg font-semibold block">{currentSample.title}</span>
              <span className="text-sm opacity-80">{currentSample.description}</span>
            </div>
          </div>
          <div className="preview-features grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="feature bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-white/70" />
                <span className="feature-label text-sm opacity-80">AI Analysis</span>
              </div>
              <span className="feature-value text-base">Deep requirements extraction</span>
            </div>
            <div className="feature bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-white/70" />
                <span className="feature-label text-sm opacity-80">Smart Planning</span>
              </div>
              <span className="feature-value text-base">Optimal resource allocation</span>
            </div>
            <div className="feature bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-white/70" />
                <span className="feature-label text-sm opacity-80">Timeline</span>
              </div>
              <span className="feature-value text-base">Realistic project scheduling</span>
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
            Experience AI Project Planning
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
      </div>
    </section>
  );
};