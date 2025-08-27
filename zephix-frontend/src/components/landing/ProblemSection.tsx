import React from 'react';
import { LANDING_CONTENT } from '../../lib/constants';

const ProblemSection: React.FC = () => {
  return (
    <section id="problem" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {LANDING_CONTENT.problem.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {LANDING_CONTENT.problem.subtitle}
          </p>
        </div>

        {/* Pain Point Stories */}
        <div className="space-y-8 max-w-4xl mx-auto mb-16">
          <div className="bg-white p-6 rounded-lg border-l-4 border-orange-500 shadow-sm">
            <p className="text-gray-700 text-lg">
              😓 "We discovered our lead developer was assigned to 5 critical tasks on the same day... 
              when she called in sick from burnout."
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border-l-4 border-red-500 shadow-sm">
            <p className="text-gray-700 text-lg">
              😤 "A one-week delay in the API project silently cascaded into three other projects. 
              We found out in the quarterly review."
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border-l-4 border-yellow-500 shadow-sm">
            <p className="text-gray-700 text-lg">
              🤯 "Our PM tools track 156 fields, but couldn't tell us that our entire Q4 roadmap 
              depended on one overworked contractor."
            </p>
          </div>
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {LANDING_CONTENT.problem.problems.map((problem, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="text-5xl mb-6 text-center">
                {problem.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                {problem.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-center mb-6 leading-relaxed">
                {problem.description}
              </p>

              {/* Stat */}
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 border border-red-200">
                  <span className="text-lg font-bold text-red-600">
                    {problem.stat}
                  </span>
                </div>
              </div>

              {/* Source */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Source: {problem.source}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-red-50 border border-red-200 text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-3" />
            These problems cost companies millions annually
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
