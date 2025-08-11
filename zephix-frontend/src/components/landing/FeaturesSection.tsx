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
      color: "indigo",
      sectionId: "strategic-planning"
    },
    {
      icon: Users,
      title: "Resource Management & Allocation",
      description: "Intelligent team assignment and workload balancing based on skills and availability.",
      color: "purple",
      sectionId: "resource-management"
    },
    {
      icon: BarChart3,
      title: "Timeline Optimization",
      description: "AI insights that identify critical paths and optimize project schedules for maximum efficiency.",
      color: "cyan",
      sectionId: "timeline-optimization"
    },
    {
      icon: Zap,
      title: "Automated Reporting",
      description: "Status updates and progress reports generated automatically, saving hours of manual work.",
      color: "emerald",
      sectionId: "automated-reporting"
    },
    {
      icon: Shield,
      title: "Enterprise Security & Compliance",
      description: "Built-in security features and compliance standards for enterprise environments.",
      color: "orange",
      sectionId: "enterprise-security"
    },
    {
      icon: Database,
      title: "Integration Hub",
      description: "Seamless integration with Monday.com, ClickUp, and other popular project management tools.",
      color: "blue",
      sectionId: "integration-hub"
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
                  onClick={() => onScrollToSection(feature.sectionId)}
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium text-sm group"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Detailed Feature Sections */}
        <div className="mt-20 space-y-20">
          {/* Strategic Planning Section */}
          <div id="strategic-planning" className="scroll-mt-20">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Strategic Project Planning</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Transform business requirements into actionable project plans with AI assistance
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Upload business requirements documents</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AI analyzes and extracts key objectives</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Automatically generates project structure</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Creates actionable tasks and milestones</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h4>
                <p className="text-gray-600 mb-4">
                  Document processing and requirement extraction are in development. 
                  Basic project structure generation is available.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">In Development</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Management Section */}
          <div id="resource-management" className="scroll-mt-20">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Resource Management & Allocation</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Intelligent team assignment and workload balancing based on skills and availability
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Define team member skills and availability</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AI suggests optimal task assignments</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Tracks workload and prevents overloading</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Provides capacity planning insights</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h4>
                <p className="text-gray-600 mb-4">
                  Basic team management and task assignment features are available. 
                  AI-powered optimization is in development.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Available Now</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Optimization Section */}
          <div id="timeline-optimization" className="scroll-mt-20">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Timeline Optimization</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                AI insights that identify critical paths and optimize project schedules
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Analyzes project dependencies and constraints</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Identifies critical path and bottlenecks</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Suggests timeline optimizations</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Provides risk assessment and mitigation</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h4>
                <p className="text-gray-600 mb-4">
                  Basic timeline management is available. AI-powered optimization 
                  and critical path analysis are in development.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">In Development</span>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Reporting Section */}
          <div id="automated-reporting" className="scroll-mt-20">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Automated Reporting</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Status updates and progress reports generated automatically
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Automatically tracks project progress</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Generates status reports and dashboards</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Sends automated updates to stakeholders</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Provides insights and recommendations</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h4>
                <p className="text-gray-600 mb-4">
                  Basic progress tracking and reporting are available. 
                  Automated insights and stakeholder updates are in development.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Available Now</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Security Section */}
          <div id="enterprise-security" className="scroll-mt-20">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Enterprise Security & Compliance</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Built-in security features and compliance standards for enterprise environments
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Role-based access control (RBAC)</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Data encryption at rest and in transit</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">SOC 2 Type II compliance</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Audit trails and activity logging</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h4>
                <p className="text-gray-600 mb-4">
                  Basic security features are implemented. Enterprise-grade 
                  compliance and advanced security features are planned.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Hub Section */}
          <div id="integration-hub" className="scroll-mt-20">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Integration Hub</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Seamless integration with your existing tools and workflows
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Connect with Monday.com, ClickUp, Jira</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Sync data bidirectionally</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">API access for custom integrations</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Webhook support for real-time updates</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h4>
                <p className="text-gray-600 mb-4">
                  API foundation is in place. Specific integrations with 
                  popular tools are in development.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">In Development</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Development status */}
        <div className="mt-20 text-center">
          <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Development Status</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Available Now</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Multi-tenant organization management</li>
                  <li>• AI-powered chat assistant</li>
                  <li>• Global navigation system</li>
                  <li>• Document intelligence processing</li>
                  <li>• Perfect accessibility compliance</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Completing Now</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Team invitation management</li>
                  <li>• Organization settings</li>
                  <li>• Enhanced security scanning</li>
                  <li>• Advanced analytics dashboard</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Coming Soon</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Enterprise integrations</li>
                  <li>• Custom workflows</li>
                  <li>• Mobile app</li>
                  <li>• API access & webhooks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
