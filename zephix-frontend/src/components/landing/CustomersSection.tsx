import React from 'react';
import { Quote, TrendingUp, Clock, Users, CheckCircle } from 'lucide-react';

export const CustomersSection: React.FC = () => {
  const pilotStories = [
    {
      company: 'TechCorp Solutions',
      industry: 'IT Services',
      challenge: 'Managing 15+ concurrent client projects with varying requirements and timelines',
      solution: 'Implemented Zephix for centralized project planning, automated reporting, and stakeholder communication',
      results: [
        'Reduced project planning time by 40%',
        'Improved stakeholder satisfaction scores by 25%',
        'Eliminated manual status report creation',
        'Streamlined approval workflows across teams'
      ],
      quote: '"Zephix transformed how we manage client projects. The AI-powered insights help us identify risks early and keep stakeholders informed automatically."',
      author: 'Sarah Chen',
      title: 'Senior Project Manager'
    },
    {
      company: 'DataFlow Analytics',
      industry: 'Data & Analytics',
      challenge: 'Complex data migration projects with multiple dependencies and tight deadlines',
      solution: 'Used Zephix for dependency mapping, risk assessment, and automated progress tracking',
      results: [
        'Completed migration 2 weeks ahead of schedule',
        'Reduced risk assessment time by 60%',
        'Improved team collaboration across departments',
        'Enhanced executive reporting and visibility'
      ],
      quote: '"The automated dependency mapping and risk assessment features saved us countless hours. We can now focus on the technical challenges instead of project management overhead."',
      author: 'Michael Rodriguez',
      title: 'Director of Data Operations'
    }
  ];

  return (
    <section id="customers" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Customer Success Stories
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how enterprise teams are transforming their project management with Zephix
          </p>
        </div>

        <div className="space-y-12">
          {pilotStories.map((story, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm font-medium text-indigo-600">{story.industry}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {story.company}
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">The Challenge</h4>
                      <p className="text-gray-600">{story.challenge}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">The Solution</h4>
                      <p className="text-gray-600">{story.solution}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Key Results</h4>
                    <ul className="space-y-2">
                      {story.results.map((result, resultIndex) => (
                        <li key={resultIndex} className="flex items-start text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                    <Quote className="w-8 h-8 text-indigo-500 mb-4" />
                    <blockquote className="text-gray-700 italic mb-6 leading-relaxed">
                      "{story.quote}"
                    </blockquote>
                    <div className="border-t border-indigo-200 pt-4">
                      <div className="font-semibold text-gray-900">{story.author}</div>
                      <div className="text-sm text-gray-600">{story.title}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Project Management?
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Join our growing list of enterprise customers who are already seeing results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                Start Free Trial
              </button>
              <button className="border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
