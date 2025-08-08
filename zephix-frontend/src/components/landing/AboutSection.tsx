import React from 'react';
import { User, Target, Calendar, Zap } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </section>
  );
};
