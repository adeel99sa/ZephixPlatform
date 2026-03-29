import React from 'react';
import { Target, Calendar, Zap, Brain, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-indigo-600 mr-3" />
            <h2 className="text-4xl font-bold text-gray-900">About Zephix</h2>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Next-generation project management with AI intelligence built for enterprise teams
          </p>
        </div>

        {/* Product Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <Lightbulb className="w-6 h-6 text-indigo-600 mr-3" />
              <h3 className="text-2xl font-semibold text-gray-900">The Vision</h3>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                Zephix aims to transform how project managers handle strategic planning by 
                introducing AI intelligence that understands project requirements and creates 
                optimal execution plans.
              </p>
              <div className="border-l-4 border-indigo-500 pl-4 bg-indigo-50 p-4 rounded-r-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Where Zephix Excels</h4>
                <p className="text-gray-700 mb-3">
                  Zephix is built to handle the strategic complexity of a wide range of projects. While our AI is particularly adept at the challenges common in the following areas, its principles apply to any project requiring deep planning and resource optimization.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Complex Technology Projects:</strong> From large-scale infrastructure deployments to system modernizations, Zephix automates planning and risk assessment.
                    </div>
                  </li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Service & Product Rollouts:</strong> Streamline the implementation of new services or product launches with intelligent resource allocation and timeline optimization.
                    </div>
                  </li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Data & Business Intelligence Initiatives:</strong> Gain strategic clarity on analytics projects, ensuring resources are aligned with business objectives.
                    </div>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>The Takeaway:</strong> The core strength of Zephix lies in its ability to bring AI-powered strategic intelligence to any project—not just those listed here—that requires a proactive and data-driven approach to planning.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <Target className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-2xl font-semibold text-gray-900">The Opportunity</h3>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                Traditional project management tools focus on task execution. Zephix focuses 
                on strategic intelligence - the critical planning phase before execution begins.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <ul className="space-y-2 text-gray-700">
                  <li>• Document analysis and requirements processing</li>
                  <li>• Intelligent project plan generation</li>
                  <li>• Resource optimization recommendations</li>
                  <li>• Risk assessment and mitigation strategies</li>
                </ul>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <p className="text-gray-700">
                  <strong>AI-First Approach:</strong> Intelligence built into every aspect of 
                  project planning, not just basic automation on top of traditional tools.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Demonstrations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Intelligence</h3>
            </div>
            <div className="aspect-video bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-sm font-medium">6-8s GIF</div>
                <div className="text-xs">AI-powered insights</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Project Management</h3>
            </div>
            <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-sm font-medium">6-8s GIF</div>
                <div className="text-xs">Workflow automation</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Enterprise Features</h3>
            </div>
            <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-sm font-medium">6-8s GIF</div>
                <div className="text-xs">Security & scalability</div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Interested in AI-Powered Project Management?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Follow our development progress and be among the first to experience Zephix
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Learn More
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-colors">
                Stay Updated
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};