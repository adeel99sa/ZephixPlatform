import React from 'react';
import { Building2, Database, BarChart3, Users, ArrowRight } from 'lucide-react';

export const SolutionsSection: React.FC = () => {
  const solutions = [
    {
      icon: Building2,
      title: 'IT PMO',
      description: 'Streamline IT project portfolio management with AI-powered planning, approvals, and reporting.',
      features: ['Portfolio prioritization', 'Resource allocation', 'Risk management', 'Executive reporting']
    },
    {
      icon: Database,
      title: 'Migrations',
      description: 'Manage complex system migrations with structured workflows and automated progress tracking.',
      features: ['Migration planning', 'Dependency mapping', 'Rollback procedures', 'Progress monitoring']
    },
    {
      icon: BarChart3,
      title: 'Analytics Projects',
      description: 'Deliver data insights projects on time with clear milestones and stakeholder communication.',
      features: ['Requirements gathering', 'Data pipeline planning', 'Stakeholder updates', 'Delivery tracking']
    },
    {
      icon: Users,
      title: 'Vendor Onboarding',
      description: 'Streamline vendor integration with automated workflows and compliance tracking.',
      features: ['Vendor assessment', 'Contract management', 'Integration planning', 'Performance monitoring']
    }
  ];

  return (
    <section id="solutions" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Solutions for Enterprise Teams
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tailored project management solutions for your specific industry challenges
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {solutions.map((solution, index) => {
            const IconComponent = solution.icon;
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-200"
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{solution.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {solution.description}
                </p>

                <ul className="space-y-2 mb-6">
                  {solution.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium group">
                  Learn more
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              We can adapt our platform to your specific industry requirements and workflows.
            </p>
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
