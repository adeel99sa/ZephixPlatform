import React from 'react';
import { FileText, Shield, BarChart3 } from 'lucide-react';

export const OutcomesSection: React.FC = () => {
  const outcomes = [
    {
      icon: FileText,
      title: 'BRD to Plan',
      body: 'Generate tasks, dependencies, and dates. Edit inline, then create the project.',
      color: 'from-blue-500 to-indigo-600',
      gifTheme: 'Upload BRD. Show extracted items. Click Generate plan. Timeline appears.',
      gifSpecs: '6-8s • 1200×800 • 30fps • <2MB'
    },
    {
      icon: Shield,
      title: 'Governance',
      body: 'Stage gates with approvers and required artifacts. SLA tracking with auto escalation.',
      color: 'from-green-500 to-emerald-600',
      gifTheme: 'Add a Design gate. Add approvers. SLA clock ticks. Escalation toast shows.',
      gifSpecs: '6-8s • 1200×800 • 30fps • <2MB'
    },
    {
      icon: BarChart3,
      title: 'Reporting',
      body: 'One pager with status, risks, changes, and next steps. Share with a link.',
      color: 'from-purple-500 to-pink-600',
      gifTheme: 'Open Project One Pager. Toggle risk heatmap. Click Share link.',
      gifSpecs: '6-8s • 1200×800 • 30fps • <2MB'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            From BRD to Project in Minutes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how Zephix transforms your business requirements into actionable project plans
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {outcomes.map((outcome, index) => {
            const IconComponent = outcome.icon;
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-200 text-center"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${outcome.color} rounded-xl flex items-center justify-center mx-auto mb-6`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {outcome.title}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {outcome.body}
                </p>

                {/* GIF Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center p-4">
                  <div className="text-center text-gray-500">
                    <div className="text-sm font-medium mb-2">GIF Placeholder</div>
                    <div className="text-xs mb-3 font-semibold">{outcome.gifSpecs}</div>
                    <div className="text-xs leading-relaxed max-w-[200px] mx-auto">
                      {outcome.gifTheme}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
