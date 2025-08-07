import React, { useState, useRef, useEffect } from 'react';
import { Upload, Zap, Download, Clock, CheckCircle2, AlertTriangle, Users, Calendar } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const steps = [
    {
      title: "Upload Your BRD",
      description: "Drop your Business Requirements Document - any format, any size",
      icon: Upload,
      duration: "5 seconds",
      before: {
        title: "The Old Way: Manual Analysis",
        items: [
          { icon: Clock, text: "6+ hours reading through documents", type: "problem" },
          { icon: AlertTriangle, text: "Missing critical requirements", type: "problem" },
          { icon: Users, text: "Unclear stakeholder mapping", type: "problem" }
        ]
      },
      after: {
        title: "Zephix AI: Instant Intelligence",
        items: [
          { icon: CheckCircle2, text: "15 core requirements extracted", type: "solution" },
          { icon: CheckCircle2, text: "8 stakeholders automatically mapped", type: "solution" },
          { icon: CheckCircle2, text: "3 critical dependencies identified", type: "solution" }
        ]
      }
    },
    {
      title: "AI Generates Your Plan",
      description: "Watch as intelligent algorithms create your complete project blueprint",
      icon: Zap,
      duration: "30 seconds",
      before: {
        title: "Traditional Planning: Manual Labor",
        items: [
          { icon: Clock, text: "2-3 weeks creating project plans", type: "problem" },
          { icon: AlertTriangle, text: "Inconsistent task breakdowns", type: "problem" },
          { icon: Users, text: "Resource conflicts and bottlenecks", type: "problem" }
        ]
      },
      after: {
        title: "AI-Powered Planning: Instant Excellence",
        items: [
          { icon: CheckCircle2, text: "47 tasks across 5 phases generated", type: "solution" },
          { icon: CheckCircle2, text: "Optimal 8-week critical path found", type: "solution" },
          { icon: CheckCircle2, text: "Team of 6 perfectly balanced", type: "solution" }
        ]
      }
    },
    {
      title: "Execute With Confidence",
      description: "Download your execution-ready plan and start leading, not managing",
      icon: Download,
      duration: "Forever",
      before: {
        title: "Typical PM Reality: Constant Fire-Fighting",
        items: [
          { icon: AlertTriangle, text: "Reactive problem solving", type: "problem" },
          { icon: Clock, text: "60% time on admin work", type: "problem" },
          { icon: Users, text: "Team confusion and delays", type: "problem" }
        ]
      },
      after: {
        title: "Strategic Leadership: Proactive Success",
        items: [
          { icon: CheckCircle2, text: "Proactive risk mitigation", type: "solution" },
          { icon: CheckCircle2, text: "85% less administrative overhead", type: "solution" },
          { icon: CheckCircle2, text: "Team clarity and momentum", type: "solution" }
        ]
      }
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-900 to-slate-800 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">Transform Your Workflow</span>
          </div>
          <h2 className="text-5xl font-bold text-white mb-6">
            From Chaos to 
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> Clarity</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            See the dramatic transformation from traditional project management struggles 
            to AI-powered strategic leadership in three simple steps.
          </p>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center mb-16">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              
              return (
                <div key={index} className="flex items-center">
                  <button
                    onClick={() => setActiveStep(index)}
                    className={`relative flex flex-col items-center space-y-3 p-4 rounded-xl transition-all duration-500 ${
                      isActive ? 'scale-110' : 'scale-100 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`relative p-4 rounded-xl border-2 transition-all duration-500 ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/25' 
                        : isCompleted
                          ? 'bg-green-600 border-green-500'
                          : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                      {isActive && (
                        <div className="absolute inset-0 bg-indigo-500 rounded-xl animate-pulse opacity-20"></div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold text-sm">{step.title}</div>
                      <div className="text-slate-400 text-xs">{step.duration}</div>
                    </div>
                  </button>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 transition-colors duration-500 ${
                      index < activeStep ? 'bg-green-500' : 'bg-slate-600'
                    }`}>
                      <div className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ${
                        index === activeStep ? 'w-full' : 'w-0'
                      }`}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Before/After comparison */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Before - Problems */}
          <div className={`transition-all duration-700 transform ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
          }`}>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{steps[activeStep].before.title}</h3>
                  <p className="text-red-300 text-sm">What PMs deal with today</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {steps[activeStep].before.items.map((item, index) => {
                  const ItemIcon = item.icon;
                  return (
                    <div 
                      key={index}
                      className={`flex items-center space-x-3 p-4 bg-red-500/5 rounded-lg border border-red-500/10 transition-all duration-500 transform ${
                        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${index * 200}ms` }}
                    >
                      <ItemIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="text-red-200">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* After - Solutions */}
          <div className={`transition-all duration-700 transform ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
          }`}>
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{steps[activeStep].after.title}</h3>
                  <p className="text-green-300 text-sm">What Zephix enables</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {steps[activeStep].after.items.map((item, index) => {
                  const ItemIcon = item.icon;
                  return (
                    <div 
                      key={index}
                      className={`flex items-center space-x-3 p-4 bg-green-500/5 rounded-lg border border-green-500/10 transition-all duration-500 transform ${
                        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${(index * 200) + 300}ms` }}
                    >
                      <ItemIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-green-200">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Transform Your PM Workflow?</h3>
            <p className="text-slate-300 mb-6">Join hundreds of PMs who've eliminated administrative overhead and rediscovered strategic leadership.</p>
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl">
              Transform Your Next Project
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
