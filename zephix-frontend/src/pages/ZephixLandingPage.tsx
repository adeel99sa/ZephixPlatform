import React, { useState, useEffect } from 'react';
import { ArrowRight, Brain, Users, Target, BarChart3, Zap, Shield, Globe, Check, ChevronDown, Play, Clock, Code, Database, Cpu } from 'lucide-react';
import EarlyAccessModal from '../components/modals/EarlyAccessModal';

const ZephixLandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'access' | 'demo'>('access');

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const capabilities = [
    { 
      icon: Brain, 
      title: "AI Project Intelligence", 
      description: "Claude-powered assistant trained on PMI standards and industry best practices. Get expert PM guidance for any scenario.",
      gradient: "from-purple-500 to-pink-500"
    },
    { 
      icon: Target, 
      title: "Complete PM Automation", 
      description: "Automate planning, monitoring, and reporting across projects, portfolios, programs, and tasks. Built for the entire PM lifecycle.",
      gradient: "from-blue-500 to-cyan-500"
    },
    { 
      icon: Users, 
      title: "Portfolio & Program Management", 
      description: "Coordinate multiple projects, optimize resource allocation, and track program dependencies with intelligent analysis.",
      gradient: "from-green-500 to-emerald-500"
    },
    { 
      icon: BarChart3, 
      title: "Intelligent Analytics", 
      description: "Real-time project health monitoring, risk prediction, and data-driven recommendations powered by AI analysis.",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const techStack = [
    { icon: Code, label: "NestJS + TypeScript Backend" },
    { icon: Database, label: "PostgreSQL + Vector Search" },
    { icon: Cpu, label: "Claude AI Integration" },
    { icon: Shield, label: "Enterprise Security" }
  ];

  const pmScenarios = [
    "Convert Business Requirements into detailed project plans",
    "Generate work breakdown structures (WBS) from project scope",
    "Automate risk identification and mitigation planning", 
    "Create stakeholder communication strategies",
    "Optimize portfolio resource allocation",
    "Track program dependencies and deliverables",
    "Generate progress reports and status updates",
    "Provide next-best-action recommendations"
  ];

  const handleModalOpen = (type: 'access' | 'demo') => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent)]"></div>
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.2),transparent)]"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        ></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(156,146,172,0.1)_1px,transparent_0)] bg-[length:20px_20px]"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Zephix Co-pilot
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <a href="#capabilities" className="text-gray-300 hover:text-white transition-colors">Capabilities</a>
          <a href="#technology" className="text-gray-300 hover:text-white transition-colors">Technology</a>
          <button 
            onClick={() => handleModalOpen('access')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105"
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className={`transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Powered by Claude AI + PMI Standards</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                AI Assistant for
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Project Managers
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Automate the administrative burden of project management. From individual tasks to enterprise portfolios, 
              Zephix Co-pilot handles planning, monitoring, and reporting so you can focus on strategic leadership.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={() => handleModalOpen('access')}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => handleModalOpen('demo')}
                className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Play className="w-5 h-5 ml-1" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* What Zephix Does */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              The AI PM Assistant That Handles Everything
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Stop spending 60% of your time on administrative tasks. Let AI handle the planning, monitoring, and reporting 
            while you focus on strategic project leadership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {pmScenarios.map((scenario, index) => (
            <div 
              key={index}
              className="flex items-start space-x-4 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-300 leading-relaxed">{scenario}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Core Capabilities */}
      <div id="capabilities" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Built for Enterprise Project Management
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Comprehensive PM automation that scales from individual projects to enterprise portfolios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {capabilities.map((capability, index) => (
            <div 
              key={index}
              className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-500 hover:scale-105"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${capability.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <capability.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">{capability.title}</h3>
              <p className="text-gray-400 leading-relaxed">{capability.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Section */}
      <div id="technology" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Enterprise-Grade Technology Stack
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Built with modern cloud architecture and AI technologies for reliability, security, and scale
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {techStack.map((tech, index) => (
            <div 
              key={index}
              className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 text-center hover:bg-white/10 transition-all duration-300"
            >
              <tech.icon className="w-8 h-8 text-purple-400 mx-auto mb-4" />
              <span className="text-gray-300 font-medium">{tech.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">PMI Standards</h3>
              <p className="text-gray-400">Built on official PMI methodologies and Rita Mulcahy PMP expertise</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">Vector Search</h3>
              <p className="text-gray-400">Semantic search through comprehensive PM knowledge base</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-green-400">Cloud Native</h3>
              <p className="text-gray-400">Scalable microservices architecture on Railway Pro infrastructure</p>
            </div>
          </div>
        </div>
      </div>

      {/* Problem & Solution */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              <span className="text-red-400">The Problem:</span><br />
              <span className="text-white">PM Administrative Overload</span>
            </h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-3"></div>
                <p>Project managers spend 60% of their time on administrative tasks instead of strategic leadership</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-3"></div>
                <p>Manual planning processes take weeks and are often outdated before implementation</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-3"></div>
                <p>Inconsistent PM practices across portfolios lead to poor coordination and resource waste</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-3"></div>
                <p>Complex reporting requirements consume valuable time without adding strategic value</p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-4xl font-bold mb-6">
              <span className="text-green-400">The Solution:</span><br />
              <span className="text-white">AI-Powered PM Automation</span>
            </h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-3"></div>
                <p>Automate 90% of administrative PM work with AI-driven planning and reporting</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-3"></div>
                <p>Generate comprehensive project plans in minutes, not weeks</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-3"></div>
                <p>Ensure PMI-standard consistency across all projects and portfolios</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-3"></div>
                <p>Get intelligent recommendations and proactive risk alerts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              How Zephix Co-pilot Works
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Intelligent automation powered by Claude AI and comprehensive PM knowledge
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Input Your Project Data</h3>
            <p className="text-gray-400">
              Upload BRDs, define scope, or describe your project goals. Zephix understands any project input format.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">AI Analysis & Planning</h3>
            <p className="text-gray-400">
              Claude AI analyzes your project using PMI standards and generates comprehensive plans with best practices.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Execute & Monitor</h3>
            <p className="text-gray-400">
              Get real-time guidance, automated reporting, and intelligent recommendations throughout project execution.
            </p>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Perfect for Any PM Scenario
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl border border-purple-500/20">
            <Target className="w-12 h-12 text-purple-400 mb-6" />
            <h3 className="text-2xl font-bold mb-4 text-white">Individual Projects</h3>
            <p className="text-gray-400 mb-6">
              From software development to construction projects. Any methodology: Agile, Waterfall, or Hybrid.
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Automated project planning</li>
              <li>• WBS generation</li>
              <li>• Risk management</li>
              <li>• Progress monitoring</li>
            </ul>
          </div>
          
          <div className="p-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl border border-blue-500/20">
            <BarChart3 className="w-12 h-12 text-blue-400 mb-6" />
            <h3 className="text-2xl font-bold mb-4 text-white">Portfolio Management</h3>
            <p className="text-gray-400 mb-6">
              Coordinate multiple projects, optimize resources, and maintain strategic alignment across your portfolio.
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Resource optimization</li>
              <li>• Portfolio analytics</li>
              <li>• Cross-project dependencies</li>
              <li>• Strategic alignment</li>
            </ul>
          </div>
          
          <div className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-500/20">
            <Users className="w-12 h-12 text-green-400 mb-6" />
            <h3 className="text-2xl font-bold mb-4 text-white">Program Coordination</h3>
            <p className="text-gray-400 mb-6">
              Manage complex programs with multiple interconnected projects and stakeholder groups.
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Program dependency tracking</li>
              <li>• Benefits realization</li>
              <li>• Stakeholder coordination</li>
              <li>• Risk aggregation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Early Access CTA */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-3xl border border-white/10 p-12 text-center">
          <h2 className="text-4xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Ready to Transform Your PM Practice?
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the early access program and be among the first to experience AI-powered project management automation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => handleModalOpen('access')}
              className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center space-x-2"
            >
              <span>Request Early Access</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => handleModalOpen('demo')}
              className="px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/10 transition-all duration-300"
            >
              Schedule Demo
            </button>
          </div>
          
          <p className="text-sm text-gray-400 mt-6">
            No fake promises. No inflated claims. Just intelligent PM automation that works.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Zephix Co-pilot
            </span>
          </div>
          <div className="flex items-center space-x-8 text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm mt-8">
          © 2025 Zephix Co-pilot. Built for Project Managers, by Project Managers.
        </div>
      </footer>

      {/* Modal */}
      <EarlyAccessModal 
        isOpen={modalOpen}
        onClose={handleModalClose}
        type={modalType}
      />
    </div>
  );
};

export default ZephixLandingPage;
