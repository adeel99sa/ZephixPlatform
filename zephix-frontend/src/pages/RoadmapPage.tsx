import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Calendar, Target, CheckCircle2, Clock } from 'lucide-react';

export const RoadmapPage: React.FC = () => {
  const roadmapItems = [
    {
      phase: 'Phase 1 - Foundation',
      status: 'completed',
      items: [
        'Basic project structure and planning',
        'User authentication and management',
        'Core dashboard functionality',
        'Basic project templates'
      ]
    },
    {
      phase: 'Phase 2 - AI Integration',
      status: 'in-progress',
      items: [
        'Advanced AI document processing',
        'Automated reporting and analytics',
        'Smart resource allocation',
        'Risk assessment algorithms'
      ]
    },
    {
      phase: 'Phase 3 - Enterprise Features',
      status: 'planned',
      items: [
        'Enterprise integrations (Monday.com, ClickUp)',
        'Advanced security and RBAC',
        'Custom workflows and automations',
        'API access and webhooks'
      ]
    },
    {
      phase: 'Phase 4 - Advanced Analytics',
      status: 'planned',
      items: [
        'Predictive analytics and forecasting',
        'Advanced reporting and dashboards',
        'Team performance insights',
        'Portfolio management features'
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'planned':
        return <Target className="w-5 h-5 text-blue-500" />;
      default:
        return <Target className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'planned':
        return 'Planned';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-2 mb-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ZEPHIX</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Product Roadmap</h1>
          <p className="text-gray-600 mt-2">Our development journey and upcoming features</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current Status */}
        <div className="bg-white rounded-xl p-8 mb-12 shadow-sm border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Development Status</h2>
            <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              <span>65% Complete - Targeting Director Demo in 8 Weeks</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Working Now</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-3" />
                  <span className="text-gray-700">Basic project management functionality</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-3" />
                  <span className="text-gray-700">User authentication and account management</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-3" />
                  <span className="text-gray-700">Core dashboard and project views</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Coming Next</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Clock className="w-4 h-4 text-yellow-500 mr-3" />
                  <span className="text-gray-700">AI-powered document processing</span>
                </li>
                <li className="flex items-center">
                  <Clock className="w-4 h-4 text-yellow-500 mr-3" />
                  <span className="text-gray-700">Automated reporting and analytics</span>
                </li>
                <li className="flex items-center">
                  <Clock className="w-4 h-4 text-yellow-500 mr-3" />
                  <span className="text-gray-700">Enterprise integrations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Roadmap Timeline */}
        <div className="space-y-8">
          {roadmapItems.map((phase, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(phase.status)}
                  <h3 className="text-xl font-semibold text-gray-900">{phase.phase}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  phase.status === 'completed' ? 'bg-green-100 text-green-800' :
                  phase.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {getStatusText(phase.status)}
                </span>
              </div>

              <ul className="space-y-3">
                {phase.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      phase.status === 'completed' ? 'bg-green-500' :
                      phase.status === 'in-progress' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Honest Note */}
        <div className="mt-12 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Honest About Our Timeline
            </h3>
            <p className="text-yellow-700">
              This roadmap represents our planned development path. We're building this platform while managing real projects, 
              so timelines may adjust based on real-world feedback and priorities. We're committed to transparency about our progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
