import React, { useState, useEffect } from 'react';
import { Zap, Target, ArrowRight, Play } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface HeroSectionProps {
  onDemoRequest: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDemoRequest }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => setIsTyping(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="hero" className="relative hero-bg overflow-hidden min-h-screen flex items-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className={`text-center transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Private Beta Badge */}
          <div className="mb-6">
            <StatusBadge onDark={true} />
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            AI Assistant for
            <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Project Managers
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Automate the administrative burden of project management. From individual tasks to enterprise portfolios, 
            Zephix Co-pilot handles planning, monitoring, and reporting so you can focus on strategic leadership.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={onDemoRequest}
              className="btn-primary text-lg px-8 py-4 group"
            >
              Request Demo
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="btn-secondary text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-gray-900 transition-colors">
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </button>
          </div>
          
          {/* Trust Indicators */}
          <div className="space-y-4">
            <p className="text-slate-400 text-sm font-medium">Trusted by enterprise teams</p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300 backdrop-blur-sm">
                SSO
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300 backdrop-blur-sm">
                RBAC
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300 backdrop-blur-sm">
                Audit logs
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300 backdrop-blur-sm">
                Encryption at rest and in transit
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Animation Element */}
        <div className={`absolute bottom-10 left-1/2 transform -translate-x-1/2 transition-all duration-1000 ${isTyping ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-sm ml-2">AI is thinking...</span>
          </div>
        </div>
      </div>
    </section>
  );
};
