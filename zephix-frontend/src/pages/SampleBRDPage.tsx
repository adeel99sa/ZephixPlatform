import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Upload, FileText, Calendar, CheckCircle, Clock, Users, 
  AlertTriangle, Zap, Brain, TrendingUp, Shield, BarChart3, 
  Sparkles, Activity, Target, GitBranch, Network, Layers,
  ChevronRight, Play, Rocket, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfettiEffect } from '../components/demo/ConfettiEffect';
import { AnimatedGanttChart } from '../components/demo/AnimatedGanttChart';
import { useAnalytics } from '../hooks/useAnalytics';

// Neural Network Visualization Component
const NeuralNetworkViz: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const nodes = [
    { id: 1, x: 100, y: 50, label: 'BRD Input' },
    { id: 2, x: 250, y: 30, label: 'NLP Engine' },
    { id: 3, x: 250, y: 80, label: 'Pattern Recognition' },
    { id: 4, x: 400, y: 50, label: 'Project Intelligence' },
    { id: 5, x: 550, y: 50, label: 'Optimized Plan' }
  ];

  const connections = [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 2, to: 4 },
    { from: 3, to: 4 },
    { from: 4, to: 5 }
  ];

  return (
    <div className="relative w-full h-48">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 650 130">
        {/* Connections */}
        {connections.map((conn, index) => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          return (
            <motion.line
              key={index}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="url(#gradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: isActive ? 1 : 0,
                opacity: isActive ? 0.6 : 0
              }}
              transition={{ 
                duration: 2,
                delay: index * 0.3,
                ease: "easeInOut"
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, index) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="20"
              fill="url(#nodeGradient)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: isActive ? [1, 1.2, 1] : 0,
                opacity: isActive ? 1 : 0
              }}
              transition={{ 
                duration: 0.5,
                delay: index * 0.2,
                scale: {
                  repeat: isActive ? Infinity : 0,
                  duration: 2,
                  delay: index * 0.2
                }
              }}
            />
            <motion.text
              x={node.x}
              y={node.y + 35}
              textAnchor="middle"
              className="text-xs fill-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ delay: index * 0.2 + 0.5 }}
            >
              {node.label}
            </motion.text>
          </g>
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <radialGradient id="nodeGradient">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

// Typewriter Text Component
const TypewriterText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return <span>{displayText}</span>;
};

// Processing Step Component
const ProcessingStep: React.FC<{ 
  icon: React.FC<any>; 
  text: string; 
  status: 'pending' | 'active' | 'complete';
  delay?: number;
}> = ({ icon: Icon, text, status, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-500 ${
        status === 'complete' ? 'bg-green-500/10 border border-green-500/20' :
        status === 'active' ? 'bg-indigo-500/10 border border-indigo-500/20' :
        'bg-slate-800/50 border border-slate-700'
      }`}
    >
      <div className={`relative ${status === 'active' ? 'animate-pulse' : ''}`}>
        <Icon className={`w-5 h-5 ${
          status === 'complete' ? 'text-green-400' :
          status === 'active' ? 'text-indigo-400' :
          'text-slate-500'
        }`} />
        {status === 'active' && (
          <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"></div>
        )}
      </div>
      <span className={`text-sm ${
        status === 'complete' ? 'text-green-300' :
        status === 'active' ? 'text-indigo-300' :
        'text-slate-400'
      }`}>
        {status === 'active' ? <TypewriterText text={text} /> : text}
      </span>
      {status === 'complete' && (
        <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
      )}
    </motion.div>
  );
};

// Insight Stream Component
const InsightStream: React.FC<{ insights: string[]; isActive: boolean }> = ({ insights, isActive }) => {
  const [visibleInsights, setVisibleInsights] = useState<number[]>([]);

  useEffect(() => {
    if (isActive) {
      insights.forEach((_, index) => {
        setTimeout(() => {
          setVisibleInsights(prev => [...prev, index]);
        }, index * 1500);
      });
    } else {
      setVisibleInsights([]);
    }
  }, [isActive, insights]);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visibleInsights.map(index => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-300">{insights[index]}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Main Component
export const SampleBRDPage: React.FC = () => {
  const [phase, setPhase] = useState<'intro' | 'processing' | 'results' | 'exploration'>('intro');
  const [processingStep, setProcessingStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { trackDemoProgress, trackDemoConversion, trackDemoEngagement } = useAnalytics();

  // Enterprise sample data
  const enterpriseSampleData = {
    project: "Legacy System Data Migration",
    brdPages: "Comprehensive enterprise documentation",
    stakeholders: [
      "IT Operations Team", "Business Analysts", "End Users (Sales & Support)", 
      "Compliance Team", "External Vendor (CloudTech Solutions)", 
      "Executive Sponsors", "Security Team", "Quality Assurance"
    ],
    timeline: "Optimized project timeline",
    budget: "Enterprise-scale investment",
    teamSize: "Cross-functional team",
    risks: [
      { level: "High", item: "Data integrity during migration", mitigation: "Automated validation scripts" },
      { level: "Medium", item: "User training completion", mitigation: "Phased rollout approach" },
      { level: "Low", item: "Vendor coordination delays", mitigation: "Weekly sync meetings" }
    ],
    phases: [
      "Discovery & Analysis (2 weeks)",
      "Migration Planning (3 weeks)", 
      "Development & Testing (8 weeks)",
      "User Training (2 weeks)",
      "Go-Live & Support (3 weeks)"
    ]
  };

  const processingSteps = [
    { icon: Brain, text: "Reading 47-page BRD structure...", duration: 3000 },
    { icon: Network, text: "Mapping 23 stakeholder dependencies...", duration: 3000 },
    { icon: TrendingUp, text: "Optimizing timeline for your team...", duration: 3000 },
    { icon: Target, text: "Generating intelligent recommendations...", duration: 3000 }
  ];

  const insights = [
    "💡 Identified 12 stakeholder groups across 3 departments",
    "⚠️ Found 3 potential risks requiring mitigation strategies",
    "🚀 Optimized critical path for 23% faster delivery",
    "🎯 Recommended phased approach to minimize business disruption",
    "💰 Budget allocation optimized across 5 project phases",
    "👥 Team composition balanced for maximum efficiency"
  ];

  const handleStartDemo = () => {
    setPhase('processing');
    trackDemoProgress('demo_started');
    
    // Simulate processing steps
    processingSteps.forEach((step, index) => {
      setTimeout(() => {
        setProcessingStep(index + 1);
        trackDemoProgress(`processing_${step.text}`, (index + 1) * 3);
      }, (index + 1) * 3000);
    });

    // Show results after processing
    setTimeout(() => {
      setPhase('results');
      setShowConfetti(true);
      trackDemoProgress('results_revealed', processingSteps.length * 3);
      setTimeout(() => setShowConfetti(false), 5000);
    }, processingSteps.length * 3000 + 1000);
  };

  const handleExplore = () => {
    setPhase('exploration');
    trackDemoProgress('exploration_started');
  };

  const handleRestart = () => {
    setPhase('intro');
    setProcessingStep(0);
    trackDemoProgress('demo_restarted');
  };

  // Track analytics
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'AI Theater BRD Demo',
        page_location: '/sample-brd'
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-2 text-white hover:text-indigo-400 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">ZEPHIX</span>
              </Link>
              
              <Link to="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              <span>AI Theater Experience</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {/* Intro Phase */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-6 py-3 mb-6"
                >
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <span className="text-indigo-300 font-medium">AI-Powered Project Intelligence</span>
                </motion.div>
                
                <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
                  <span className="block">🧠 Watch AI Transform</span>
                  <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Project Planning
                  </span>
                </h1>
                
                <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
                  Upload your BRD or try our enterprise samples below. 
                  Experience how AI transforms complex requirements into actionable project plans.
                </p>

                <div className="space-y-4">
                  <motion.button
                    onClick={handleStartDemo}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-xl"
                  >
                    <Rocket className="w-6 h-6" />
                    <span>Try Enterprise Sample: Data Migration Project</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  
                  <div className="text-sm text-slate-400">
                    No signup required • Real-time AI processing
                  </div>
                </div>

                {/* Sample BRD Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-12 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-indigo-400" />
                    Enterprise Sample: {enterpriseSampleData.project}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-slate-400">Document Size:</span>
                      <span className="block text-white font-medium">{enterpriseSampleData.brdPages}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Project Budget:</span>
                      <span className="block text-white font-medium">{enterpriseSampleData.budget}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Team Size:</span>
                      <span className="block text-white font-medium">{enterpriseSampleData.teamSize}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Processing Phase */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  AI Processing Your Project Requirements
                </h2>
                <p className="text-slate-300">
                  Watch as our AI analyzes and optimizes your project plan
                </p>
              </div>

              {/* Neural Network Visualization */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 mb-8">
                <NeuralNetworkViz isActive={true} />
              </div>

              {/* Processing Steps */}
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-indigo-400" />
                    Processing Steps
                  </h3>
                  <div className="space-y-3">
                    {processingSteps.map((step, index) => (
                      <ProcessingStep
                        key={index}
                        icon={step.icon}
                        text={step.text}
                        status={
                          processingStep > index ? 'complete' :
                          processingStep === index ? 'active' :
                          'pending'
                        }
                        delay={index * 0.2}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                    AI Insights Stream
                  </h3>
                  <InsightStream insights={insights} isActive={processingStep > 0} />
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mt-8">
                <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(processingStep / processingSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Results Phase */}
          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Success Banner */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </motion.div>
                
                <h2 className="text-3xl font-bold text-white mb-4">
                  ✨ INTELLIGENT PLAN GENERATED
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto text-sm">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <span className="text-slate-400">What took your team:</span>
                    <span className="block text-2xl font-bold text-white">3 weeks</span>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg p-4 border border-indigo-500/20">
                    <span className="text-indigo-300">Generated in:</span>
                    <span className="block text-2xl font-bold text-white">47 seconds</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
                  <span className="text-green-400">✓ 94% accuracy</span>
                  <span className="text-green-400">✓ 23% faster delivery</span>
                  <span className="text-green-400">✓ Zero manual effort</span>
                </div>
              </motion.div>

              {/* Animated Gantt Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AnimatedGanttChart
                  tasks={[
                    { id: '1', name: 'Discovery', start: 0, duration: 2, color: 'bg-indigo-500' },
                    { id: '2', name: 'Planning', start: 2, duration: 3, color: 'bg-purple-500', dependencies: ['1'] },
                    { id: '3', name: 'Development', start: 5, duration: 8, color: 'bg-blue-500', dependencies: ['2'] },
                    { id: '4', name: 'Training', start: 11, duration: 2, color: 'bg-green-500', dependencies: ['3'] },
                    { id: '5', name: 'Go-Live', start: 13, duration: 3, color: 'bg-yellow-500', dependencies: ['4'] }
                  ]}
                  isAnimating={true}
                />
              </motion.div>

              {/* Generated Results Grid */}
              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                {/* Project Timeline */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
                    Optimized Timeline
                  </h3>
                  <div className="space-y-2">
                    {enterpriseSampleData.phases.map((phase, index) => (
                      <motion.div
                        key={index}
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-3 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-indigo-300">{phase}</span>
                          <ChevronRight className="w-4 h-4 text-indigo-400" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Risk Assessment */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-yellow-400" />
                    Risk Assessment & Mitigation
                  </h3>
                  <div className="space-y-3">
                    {enterpriseSampleData.risks.map((risk, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className={`border rounded-lg p-3 ${
                          risk.level === 'High' ? 'bg-red-500/10 border-red-500/20' :
                          risk.level === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20' :
                          'bg-green-500/10 border-green-500/20'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                            risk.level === 'High' ? 'text-red-400' :
                            risk.level === 'Medium' ? 'text-yellow-400' :
                            'text-green-400'
                          }`} />
                          <div className="flex-1">
                            <div className="text-sm text-white font-medium">{risk.item}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Mitigation: {risk.mitigation}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Team Composition */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-purple-400" />
                  Intelligent Team Assignment
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {enterpriseSampleData.stakeholders.slice(0, 8).map((stakeholder, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-3 text-center cursor-pointer"
                    >
                      <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                      <span className="text-xs text-purple-300">{stakeholder}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* CTA Section */}
              <div className="text-center pt-8">
                <motion.button
                  onClick={handleExplore}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-xl"
                >
                  <Play className="w-5 h-5" />
                  <span>Explore the Interactive Plan</span>
                </motion.button>
                
                <div className="mt-4 text-sm text-slate-400">
                  Click to see how you can interact with the generated plan
                </div>
              </div>
            </motion.div>
          )}

          {/* Exploration Phase */}
          {phase === 'exploration' && (
            <motion.div
              key="exploration"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  🎮 Explore the Intelligence
                </h2>
                <p className="text-slate-300">
                  Interact with your AI-generated project plan
                </p>
              </div>

              {/* Interactive Elements Info */}
              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 mb-8">
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="bg-indigo-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">Drag & Drop</h4>
                    <p className="text-sm text-slate-400">Reassign team members</p>
                  </div>
                  <div>
                    <div className="bg-purple-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">Real-time Updates</h4>
                    <p className="text-sm text-slate-400">See impact instantly</p>
                  </div>
                  <div>
                    <div className="bg-green-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Layers className="w-6 h-6 text-green-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">Multiple Views</h4>
                    <p className="text-sm text-slate-400">Timeline, Gantt, Kanban</p>
                  </div>
                </div>
              </div>

                             {/* Competitive Advantage */}
               <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
                 <h3 className="text-2xl font-bold text-white mb-6 text-center">
                   🏆 While Others Use Templates...
                 </h3>
                 <div className="grid md:grid-cols-4 gap-4">
                   <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                     <h4 className="text-red-400 font-medium mb-2">Traditional Tools</h4>
                     <p className="text-sm text-red-300">Manual drag & drop</p>
                   </div>
                   <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                     <h4 className="text-yellow-400 font-medium mb-2">Other Platforms</h4>
                     <p className="text-sm text-yellow-300">Template selection</p>
                   </div>
                   <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                     <h4 className="text-blue-400 font-medium mb-2">Legacy Software</h4>
                     <p className="text-sm text-blue-300">Basic task management</p>
                   </div>
                   <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4 text-center">
                     <h4 className="text-indigo-400 font-bold mb-2">Zephix</h4>
                     <p className="text-sm text-indigo-300">🚀 AI reads your actual BRD</p>
                   </div>
                 </div>
               </div>

              {/* Final CTA */}
              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 text-center">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Ready to Transform Your PM Workflow?
                  </h3>
                  <p className="text-slate-300 mb-6">
                    Join hundreds of PMs who've eliminated administrative overhead and rediscovered strategic leadership.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                    <motion.a
                      href="/"
                      onClick={() => trackDemoConversion('trial')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-xl"
                    >
                      <Rocket className="w-5 h-5" />
                      <span>Start Free Trial</span>
                    </motion.a>
                    
                    <motion.button
                      onClick={() => trackDemoConversion('demo')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold transition-all border border-slate-700"
                    >
                      <Calendar className="w-5 h-5" />
                      <span>Book Live Demo</span>
                    </motion.button>
                  </div>
                  
                  <div className="text-sm text-slate-400">
                    No credit card required • 14-day free trial
                  </div>
                </div>
              </div>

              {/* Restart Button */}
              <div className="text-center">
                <button
                  onClick={handleRestart}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  ← Start Demo Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confetti Effect */}
        <ConfettiEffect isActive={showConfetti} duration={5000} />
      </div>
    </div>
  );
};
