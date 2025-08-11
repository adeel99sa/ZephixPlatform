import React from 'react';
import { Clock, FileText, Settings, Database, BarChart3 } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const painPoints = [
    {
      icon: Clock,
      title: "Manual Reporting Takes Hours",
      description: "Spending 4-6 hours/week on manual reporting and status updates.",
      color: "text-red-500"
    },
    {
      icon: FileText,
      title: "Document Management Chaos",
      description: "Document storage with manual linking to project tools creates endless coordination overhead.",
      color: "text-orange-500"
    },
    {
      icon: Settings,
      title: "Slow Planning Cycles",
      description: "2-4 weeks from business requirements to actionable project plans due to manual processes.",
      color: "text-yellow-500"
    },
    {
      icon: Database,
      title: "Complex Customizations",
      description: "Complex customizations required for enterprise workflows that don't fit standard templates.",
      color: "text-blue-500"
    },
    {
      icon: BarChart3,
      title: "Disconnected Project Types",
      description: "Managing infra, cloud, service implementation, and analytics projects separately with different tools.",
      color: "text-purple-500"
    }
  ];

  return (
    <section id="problems" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            The Real Pain Points of Enterprise Project Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real problems faced by enterprise project managers every day
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {painPoints.map((point, index) => {
            const IconComponent = point.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4`}>
                  <IconComponent className={`w-6 h-6 ${point.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {point.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>


      </div>
    </section>
  );
};
