import React, { useState, useEffect } from 'react';
import { FileText, Zap, Users, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

  const demos = [
    {
      title: "BRD Intelligence",
      subtitle: "From Requirements to Reality",
      icon: FileText,
      description: "Watch AI extract stakeholders, dependencies, and deliverables from your BRD in real-time.",
      before: "45-page BRD document with scattered requirements...",
      after: ["📋 15 core requirements identified", "👥 8 stakeholders mapped", "🎯 3 critical dependencies found", "📅 Project timeline: 12 weeks"],
      color: "indigo"
    },
    {
      title: "AI Planning Engine", 
      subtitle: "Intelligent Project Architecture",
      icon: Zap,
      description: "Generate complete project plans with tasks, timelines, and resource allocation in seconds.",
      before: "Requirements processed, generating optimal plan...",
      after: ["🏗️ 47 tasks created across 5 phases", "⏱️ Critical path: 8 weeks", "👨‍💼 Team of 6 optimally assigned", "🎯 95% on-time delivery probability"],
      color: "purple"
    },
    {
      title: "Team Orchestration",
      subtitle: "Smart Resource Optimization", 
      icon: Users,
      description: "AI matches skills to tasks and balances workloads automatically.",
      before: "Analyzing team skills and availability...",
      after: ["✨ Sarah: Frontend Lead (80% capacity)", "🚀 Mike: Backend Senior (90% capacity)", "📊 Lisa: Data Analyst (75% capacity)", "⚡ Optimal efficiency: 94%"],
      color: "cyan"
    },
    {
      title: "Risk Prevention",
      subtitle: "Proactive Project Protection",
      icon: Shield,
      description: "Identify potential roadblocks and generate mitigation strategies before they impact delivery.",
      before: "Scanning for potential risks and dependencies...",
      after: ["⚠️ 3 high-priority risks detected", "🛡️ Mitigation strategies ready", "📈 Success probability: +23%", "🎯 Delivery confidence: 97%"],
      color: "emerald"
    }
  ];

  useEffect(() => {
    const demoInterval = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % demos.length);
      setAnimationPhase(0);
    }, 5000);

    return () => clearInterval(demoInterval);
  }, []);

  useEffect(() => {
    const animationTimer = setTimeout(() => {
      setAnimationPhase(1);
    }, 1000);

    return () => clearTimeout(animationTimer);
  }, [activeDemo]);

  const currentDemo = demos[activeDemo];
  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-800 border-indigo-500/20",
    purple: "from-purple-600 to-purple-800 border-purple-500/20", 
    cyan: "from-cyan-600 to-cyan-800 border-cyan-500/20",
    emerald: "from-emerald-600 to-emerald-800 border-emerald-500/20"
  };

  return (
    <section className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:40px_40px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">Live AI Demonstrations</span>
          </div>
          <h2 className="text-5xl font-bold text-white mb-6">
            See Your Project Management 
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> Evolve</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Don't just read about AI-powered project management—watch it work. 
            Each demo shows real capabilities solving actual PM challenges.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Demo tabs */}
          <div className="space-y-4">
            {demos.map((demo, index) => {
              const Icon = demo.icon;
              const isActive = index === activeDemo;
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    setActiveDemo(index);
                    setAnimationPhase(0);
                  }}
                  className={`w-full text-left p-6 rounded-xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-white/10 border-white/20 shadow-2xl' 
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[demo.color as keyof typeof colorClasses]} transition-all duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-lg">{demo.title}</div>
                      <div className="text-slate-400 text-sm">{demo.subtitle}</div>
                    </div>
                    <ArrowRight className={`w-5 h-5 text-slate-400 transition-all duration-300 ${isActive ? 'text-white translate-x-1' : ''}`} />
                  </div>
                  {isActive && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-slate-300 text-sm">{demo.description}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive demo display */}
          <div className="relative">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
              {/* Demo header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[currentDemo.color as keyof typeof colorClasses]}`}>
                    <currentDemo.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{currentDemo.title}</div>
                    <div className="text-slate-400 text-sm">{currentDemo.subtitle}</div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

              {/* Demo content */}
              <div className="space-y-4">
                <div className="text-slate-300 text-sm mb-4">{currentDemo.before}</div>
                
                {/* Processing animation */}
                <div className="flex items-center space-x-2 mb-6">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
                  </div>
                  <span className="text-slate-400 text-sm">AI processing...</span>
                </div>

                {/* Results */}
                <div className="space-y-3">
                  {currentDemo.after.map((result, index) => (
                    <div 
                      key={index}
                      className={`flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg transition-all duration-500 transform ${
                        animationPhase === 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${index * 200}ms` }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white text-sm">{result}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo progress */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Demo {activeDemo + 1} of {demos.length}</span>
                  <div className="flex space-x-1">
                    {demos.map((_, index) => (
                      <div 
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === activeDemo ? 'bg-indigo-500' : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements for visual interest */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <button className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl">
            Experience Your Own Project 
            <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
