import React, { useState, useEffect } from 'react';
import { Zap, ArrowRight, Play, Target } from 'lucide-react';

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
    console.log('Hero: Demo request button clicked!');
    console.log('Calling onDemoRequest function...');
    onDemoRequest();
    console.log('onDemoRequest function called successfully');
  };

  const handleWatchDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Hero: Watch demo button clicked!');
    console.log('Calling onDemoRequest function...');
    // For now, also trigger demo request
    onDemoRequest();
    console.log('onDemoRequest function called successfully');
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 overflow-hidden pt-16">
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

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className={`text-center transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
              AI-Powered Project Management
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              for Enterprise Teams
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed max-w-4xl mx-auto">
            Zephix Co-pilot automates planning, reporting, and risk management—so you focus on strategy, not paperwork.
          </p>

          {/* Value proposition */}
          <p className="text-lg text-slate-400 mb-12 max-w-3xl mx-auto">
            Complete project management platform with AI intelligence built into every workflow
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 mb-12">
            {/* Test button */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                alert('TEST BUTTON CLICKED!');
                console.log('Test button clicked!');
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-lg mb-4"
            >
              TEST BUTTON
            </button>
            
            <button 
              onClick={handleDemoRequest}
              className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-indigo-500/25 active:scale-95 cursor-pointer border-2 border-transparent hover:border-white/20"
            >
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5" />
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity"></div>
            </button>

            <button 
              onClick={handleWatchDemo}
              className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors hover:scale-105 transform active:scale-95"
            >
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Play className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Watch Demo</div>
                <div className="text-sm text-slate-400">See it in action</div>
              </div>
            </button>
          </div>

          {/* Hero image placeholder */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Target className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg font-medium">Modern PM Dashboard Mockup</p>
                  <p className="text-slate-400 text-sm">AI-powered project management interface</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-6">Targeting Fortune 500 Program Managers</p>
            <div className="flex items-center justify-center space-x-8 opacity-60">
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Enterprise Ready</div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">AI-Powered</div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">65% Complete</div>
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
