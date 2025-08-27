import React from 'react';
import { LANDING_CONTENT } from '../../lib/constants';

const Timeline: React.FC = () => {
  return (
    <section id="roadmap" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {LANDING_CONTENT.timeline.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {LANDING_CONTENT.timeline.subtitle}
          </p>
        </div>

        {/* Timeline Items */}
        {LANDING_CONTENT.timeline.phases.map((phase, index) => (
          <div
            key={index}
            className={`relative flex items-center mb-12 ${
              index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
            }`}
          >
            {/* Content */}
            <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Phase Badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3">
                  {phase.status === 'current' && (
                    <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                      Current
                    </span>
                  )}
                  {phase.status === 'upcoming' && (
                    <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                      Coming Q1 2026
                    </span>
                  )}
                  {phase.status === 'planned' && (
                    <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                      Coming Q2 2026
                    </span>
                  )}
                </div>

                {/* Phase */}
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {phase.phase}
                </h3>

                {/* Title */}
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {phase.title}
                </h4>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  {phase.description}
                </p>
              </div>
            </div>

            {/* Timeline Dot */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-lg" />

            {/* Phase Label */}
            <div className={`w-1/2 ${index % 2 === 0 ? 'pl-8 text-left' : 'pr-8 text-right'}`}>
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                  <span className="text-blue-700 font-semibold">
                    {phase.phase}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Timeline;
