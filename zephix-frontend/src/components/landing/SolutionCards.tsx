import React from 'react';
import { LANDING_CONTENT } from '../../lib/constants';

const VisionSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {LANDING_CONTENT.solution.title}
          </h2>
          <p className="text-gray-600 text-center mb-12">
            {LANDING_CONTENT.solution.subtitle}
          </p>
        </div>

        {/* Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {LANDING_CONTENT.solution.solutions.map((solution, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200">
                  <span className="text-4xl">{solution.icon}</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                {solution.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-center mb-6 leading-relaxed">
                {solution.description}
              </p>

              {/* Benefit */}
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                  <span className="text-sm font-semibold text-blue-700">
                    {solution.benefit}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Concept Preview with ACTUAL Content */}
        <div className="mt-12">
          <p className="text-center text-sm text-gray-500 mb-4">Early Concept Preview:</p>
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Integrated Intelligence Dashboard</h4>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Mockup</span>
            </div>
            
            {/* Mockup content */}
            <div className="space-y-4">
              {/* Risk Alert */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex items-start">
                  <span className="text-red-500 mr-3">⚠️</span>
                  <div>
                    <p className="font-medium text-gray-900">High Risk: Resource Conflict Detected</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Sarah Johnson is allocated to 3 critical tasks on Jan 15-17.
                      This affects Project Alpha (deadline at risk) and Project Beta (dependency blocked).
                    </p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                      View resolution options →
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Project Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-xs text-gray-500">At-Risk Items</p>
                  <p className="text-2xl font-bold text-yellow-600">7</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-xs text-gray-500">On Track</p>
                  <p className="text-2xl font-bold text-green-600">65%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
            Help us build the solution you need
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisionSection;
