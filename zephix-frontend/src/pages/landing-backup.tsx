// BACKUP OF ORIGINAL LANDING PAGE
// This file contains the original landing page implementation before the redesign
// Keep this for rollback purposes

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Zap,
  Users,
  Brain,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Activity,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {}

const LandingPage: React.FC<LandingPageProps> = memo(() => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [activeRiskLevel, setActiveRiskLevel] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRiskLevel(prev => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const riskLevels = [
    { name: 'Task', icon: '📝', delay: 'API delayed 3 days', impact: 'Local impact' },
    { name: 'Project', icon: '📊', delay: '65% delivery risk', impact: '3 tasks affected' },
    { name: 'Program', icon: '🎯', delay: '2 of 5 projects yellow', impact: 'Dependencies at risk' },
    { name: 'Portfolio', icon: '💼', delay: 'Q4 capacity at 120%', impact: 'Resource conflict' },
    { name: 'Executive', icon: '🚀', delay: 'Revenue target at risk', impact: 'Strategic impact' }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 animate-gradient-shift" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-gray-800 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Zephix
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition">How it Works</a>
              <a href="#features" className="text-gray-400 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition">Pricing</a>
              <a href="/login" className="text-gray-400 hover:text-white transition">Sign In</a>
              <a 
                href="/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 font-medium"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium mb-6 backdrop-blur-sm">
                <Activity className="w-4 h-4 mr-2" />
                AI Risk Intelligence for Modern IT Teams
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Your Projects Are
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
                  Already at Risk
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                The only PM platform that learns your patterns and catches critical issues 
                2-3 weeks before they explode. While others track tasks, we prevent disasters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setIsDemoModalOpen(true)}
                  className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-lg font-medium hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  See Live Demo
                  <ArrowUpRight className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button className="px-8 py-4 bg-gray-900 text-gray-300 rounded-full text-lg font-medium border border-gray-800 hover:border-gray-700 hover:bg-gray-800 transition-all duration-300">
                  Watch 2-min Video
                </button>
              </div>
            </motion.div>
          </div>

          {/* Live Risk Visualization */}
          <div className="mt-20 relative">
            <motion.div 
              className="relative bg-gray-900/50 rounded-3xl backdrop-blur-xl border border-gray-800 p-8 overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Animated glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-purple-600/10 animate-pulse" />
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Risk Intelligence Live Stream
                  </h3>
                  <p className="text-gray-400">
                    Watch risks bubble up in real-time across your organization
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {riskLevels.map((level, index) => (
                    <motion.div
                      key={level.name}
                      className={`relative p-4 rounded-2xl border transition-all duration-500 ${
                        activeRiskLevel >= index 
                          ? 'border-red-500/50 bg-red-500/10' 
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                      animate={{
                        scale: activeRiskLevel === index ? 1.05 : 1,
                        y: activeRiskLevel === index ? -5 : 0
                      }}
                    >
                      {activeRiskLevel >= index && (
                        <div className="absolute inset-0 bg-red-500/20 rounded-2xl animate-pulse" />
                      )}
                      <div className="relative z-10">
                        <div className="text-3xl mb-2">{level.icon}</div>
                        <h4 className="font-semibold text-white">{level.name}</h4>
                        <p className="text-sm text-gray-400 mt-2">{level.delay}</p>
                        <p className="text-xs text-gray-500 mt-1">{level.impact}</p>
                        {activeRiskLevel >= index && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="mt-2"
                          >
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div 
                  className="mt-6 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-2xl border border-red-500/30 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Brain className="w-6 h-6 text-red-400" />
                      <span className="font-medium text-white">AI Recommendation:</span>
                    </div>
                    <span className="text-sm text-red-400 font-medium">
                      "Reallocate 2 developers to prevent Q4 cascade failure"
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* The Problem */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-3xl p-8 border border-red-500/20"
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                The Silent Project Killers
              </h2>
              <div className="space-y-4">
                {[
                  { icon: XCircle, text: '73% of projects discover issues too late', color: 'text-red-400' },
                  { icon: Clock, text: 'PMs waste 60% of time on status updates', color: 'text-orange-400' },
                  { icon: AlertTriangle, text: 'Risk escalation takes 2-3 weeks average', color: 'text-yellow-400' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <item.icon className={`w-6 h-6 ${item.color} flex-shrink-0 mt-0.5`} />
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* The Solution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-3xl p-8 border border-cyan-500/20"
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                Your AI Early Warning System
              </h2>
              <div className="space-y-4">
                {[
                  { icon: CheckCircle2, text: '14-21 day advance risk detection', color: 'text-cyan-400' },
                  { icon: TrendingUp, text: 'Learns patterns, reaches 70% accuracy', color: 'text-blue-400' },
                  { icon: Shield, text: 'Automatic risk aggregation across levels', color: 'text-purple-400' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <item.icon className={`w-6 h-6 ${item.color} flex-shrink-0 mt-0.5`} />
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Not Another Task Tracker
            </h2>
            <p className="text-xl text-gray-400">
              Built for teams that need to predict the future, not just document the past
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                title: 'Hierarchical Risk Intelligence',
                description: 'Automatic risk aggregation from task to C-suite',
                gradient: 'from-cyan-500 to-blue-600'
              },
              {
                icon: Brain,
                title: 'Learning AI Assistant',
                description: 'Improves accuracy with every decision',
                gradient: 'from-blue-500 to-purple-600'
              },
              {
                icon: Users,
                title: 'Resource Optimization',
                description: 'Predict bottlenecks weeks in advance',
                gradient: 'from-purple-500 to-pink-600'
              },
              {
                icon: Shield,
                title: 'Governance-Native',
                description: 'Built-in RACI and compliance tracking',
                gradient: 'from-green-500 to-teal-600'
              },
              {
                icon: BarChart3,
                title: 'Executive Dashboards',
                description: 'Real-time strategic risk visibility',
                gradient: 'from-orange-500 to-red-600'
              },
              {
                icon: Zap,
                title: 'Natural Language Input',
                description: 'Type naturally, AI handles structure',
                gradient: 'from-yellow-500 to-orange-600'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-gray-700 backdrop-blur-sm transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  2 projects
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  5 users
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  30-day risk history
                </li>
              </ul>
              <a href="/signup" className="block text-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">
                Get Started
              </a>
            </div>

            {/* Team Plan */}
            <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-2xl p-8 border border-cyan-500/30 backdrop-blur-sm transform scale-105">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">Team</h3>
                <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">Popular</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$12</span>
                <span className="text-gray-400">/user/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" />
                  Unlimited projects
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" />
                  Basic risk intelligence
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" />
                  14-day predictions
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" />
                  Email support
                </li>
              </ul>
              <a href="/signup" className="block text-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition">
                Start Free Trial
              </a>
            </div>

            {/* Business Plan */}
            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-2">Business</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$20</span>
                <span className="text-gray-400">/user/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  Everything in Team
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  Full AI learning
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  21-day predictions
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                  Priority support
                </li>
              </ul>
              <a href="/signup" className="block text-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-3xl p-12 border border-cyan-500/20 backdrop-blur-xl"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Stop Managing Chaos. Start Preventing It.
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join IT teams detecting 70% of preventable risks weeks before impact
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setIsDemoModalOpen(true)}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-lg font-medium hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
              >
                Get Personalized Demo
              </button>
              <button className="px-8 py-4 bg-transparent text-white rounded-full text-lg font-medium border border-gray-700 hover:bg-gray-900/50 transition-all duration-300">
                Start Free Trial
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              No credit card • 14-day trial • 5-minute setup
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Zephix</span>
            </div>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-gray-500 hover:text-gray-300 transition">Privacy</a>
              <a href="/terms" className="text-gray-500 hover:text-gray-300 transition">Terms</a>
              <a href="/security" className="text-gray-500 hover:text-gray-300 transition">Security</a>
              <button 
                onClick={() => setIsContactModalOpen(true)}
                className="text-gray-500 hover:text-gray-300 transition"
              >
                Contact
              </button>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500">
            <p>© 2026 Zephix. Preventing project disasters with AI.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Request Demo</h3>
            <p className="text-gray-400 mb-6">
              See how Zephix prevents project failures for your team.
            </p>
            <button 
              onClick={() => setIsDemoModalOpen(false)}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Contact Us</h3>
            <p className="text-gray-400 mb-6">
              Get in touch with our team for support or questions.
            </p>
            <button 
              onClick={() => setIsContactModalOpen(false)}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;


