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
                <h4 className="font-semibold text-gray-900 mb-2">Designed for:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Infrastructure & Cloud Projects</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Service Implementation</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Analytics & Dashboard Projects</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />System Modernization</li>
                </ul>
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

        {/* Development Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Development Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Platform Development</span>
                <span className="font-semibold text-gray-900">In Progress</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300" style={{ width: '65%' }}></div>
              </div>
              <p className="text-sm text-gray-600">
                Core AI services and user interface development
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Development Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Phase</span>
                <span className="font-semibold text-blue-600">Active Development</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300" style={{ width: '40%' }}></div>
              </div>
              <p className="text-sm text-gray-600">
                Building toward initial demonstration version
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Focus Areas</h3>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">AI Intelligence</div>
                <div className="text-sm text-gray-600">Core platform capability</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">Enterprise Ready</div>
                <div className="text-sm text-gray-600">Security and scalability</div>
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