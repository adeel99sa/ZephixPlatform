import React from 'react';
import { User, Target, Calendar, Zap } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Built by a Practicing Program Manager
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            No fake testimonials - this is an early-stage product built to solve real PM problems
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Founder Story */}
          <div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">The Founder</h3>
                  <p className="text-gray-600">Practicing Program Manager</p>
                </div>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  I'm currently managing infrastructure, cloud, service implementation, and analytics projects 
                  across multiple teams and stakeholders.
                </p>
                <p>
                  After years of struggling with Monday.com, ClickUp, and other tools that promised to solve 
                  everything but actually created more work, I decided to build the solution I needed.
                </p>
                <p>
                  Zephix is built from real pain points - the exact problems I face daily as a Program Manager 
                  in enterprise environments.
                </p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Target className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Current Focus</h3>
              </div>
              <p className="text-gray-600">
                Currently managing infra, cloud, service implementation, and analytics projects 
                while building Zephix in parallel.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Zap className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Development Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Platform Completion</span>
                  <span className="font-semibold text-gray-900">65%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
              </div>
              <p className="text-gray-600">
                Targeting director demo in 8 weeks. Building with real PM feedback and 
                focusing on enterprise-grade features.
              </p>
            </div>
          </div>
        </div>

        {/* Honest Disclaimer */}
        <div className="mt-16 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Honest About Our Stage
            </h3>
            <p className="text-yellow-700">
              This is an early-stage product. We're not claiming to have solved every PM problem yet, 
              but we're building the solution we wish existed. No fake testimonials, no exaggerated claims - 
              just honest progress toward solving real problems.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
