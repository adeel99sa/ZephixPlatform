// src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Bot, GitBranch, Zap, ArrowRight, Users, Shield, TrendingUp } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-100">Zephix</h1>
              <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">AI Co-pilot</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg"
              >
                <Zap className="w-4 h-4" />
                Launch Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Transform Your Ideas Into
              <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent"> Project Blueprints</span>
            </h1>
            
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Zephix is your AI-powered project co-pilot that transforms Business Requirements Documents 
              into comprehensive project plans with intelligent risk assessment and team optimization.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                Start Building
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <button className="border border-slate-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-800 transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Our intelligent system analyzes your requirements and generates comprehensive project frameworks 
              with built-in risk management and optimization strategies.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6">
                <GitBranch className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Smart Project Planning</h3>
              <p className="text-slate-300">
                Automatically generate comprehensive project blueprints with milestones, 
                team structures, and resource allocation based on your requirements.
              </p>
            </div>
            
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Risk Assessment</h3>
              <p className="text-slate-300">
                AI-powered risk identification and mitigation strategies to ensure 
                your projects stay on track and within budget.
              </p>
            </div>
            
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Performance Optimization</h3>
              <p className="text-slate-300">
                Continuous monitoring and optimization recommendations to maximize 
                team productivity and project success rates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Project Management?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Join thousands of teams who are already using Zephix to build better projects faster.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Get Started Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">Zephix</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <span>© 2024 Zephix. All rights reserved.</span>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
