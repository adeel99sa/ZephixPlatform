import React from 'react';
import { FileText, Zap, Users, Shield, ArrowRight, CheckCircle2, Brain, BarChart3, Settings, Database, Globe } from 'lucide-react';

interface FeaturesSectionProps {
  onScrollToSection: (sectionId: string) => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onScrollToSection }) => {
  const features = [
    {
      icon: Brain,
      title: "Strategic Project Planning",
      description: "AI-enhanced document processing that transforms business requirements into actionable project plans.",
      color: "indigo"
    },
    {
      icon: Users,
      title: "Resource Management & Allocation",
      description: "Intelligent team assignment and workload balancing based on skills and availability.",
      color: "purple"
    },
    {
      icon: BarChart3,
      title: "Timeline Optimization",
      description: "AI insights that identify critical paths and optimize project schedules for maximum efficiency.",
      color: "cyan"
    },
    {
      icon: Zap,
      title: "Automated Reporting",
      description: "Status updates and progress reports generated automatically, saving hours of manual work.",
      color: "emerald"
    },
    {
      icon: Shield,
      title: "Enterprise Security & Compliance",
      description: "Built-in security features and compliance standards for enterprise environments.",
      color: "orange"
    },
    {
      icon: Database,
      title: "Integration Hub",
      description: "Seamless integration with Monday.com, ClickUp, and other popular project management tools.",
      color: "blue"
    }
  ];

  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-800 border-indigo-500/20",
    purple: "from-purple-600 to-purple-800 border-purple-500/20", 
    cyan: "from-cyan-600 to-cyan-800 border-cyan-500/20",
    emerald: "from-emerald-600 to-emerald-800 border-emerald-500/20",
    orange: "from-orange-600 to-orange-800 border-orange-500/20",
    blue: "from-blue-600 to-blue-800 border-blue-500/20"
  };

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Core Platform Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Honest about current state - building the solution we wish existed
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <button
                  onClick={() => onScrollToSection('features')}
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium text-sm group"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Development status */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Current Development Status
            </h3>
            <p className="text-gray-600 mb-6">
              We're building this platform in parallel with managing real projects. 
              Here's what's currently available and what's coming next.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 mb-3">✅ Available Now</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                    Basic project structure and planning
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                    User authentication and management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                    Core dashboard functionality
                  </li>
                </ul>
              </div>
              
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 mb-3">🚧 Coming Soon</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                    Advanced AI document processing
                  </li>
                  <li className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                    Automated reporting and analytics
                  </li>
                  <li className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                    Enterprise integrations
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
