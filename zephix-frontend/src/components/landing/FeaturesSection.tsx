import React from 'react';
import { Cpu, Bolt, Users, CheckCircle } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Cpu className="h-8 w-8 text-indigo-600" />,
      title: 'Auto BRD Analysis',
      desc: 'Instantly extract requirements, stakeholders, and deliverables from any document.',
    },
    {
      icon: <Bolt className="h-8 w-8 text-indigo-600" />,
      title: 'AI Planning Engine',
      desc: 'Generate timelines, milestones, and resource plans in seconds, not days.',
    },
    {
      icon: <Users className="h-8 w-8 text-indigo-600" />,
      title: 'Team Orchestration',
      desc: 'Optimize assignments based on skills, availability, and workload.',
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-indigo-600" />,
      title: 'Risk Assessment',
      desc: 'Automatically identify and prioritize risks with mitigation strategies.',
    },
  ];

  return (
    <section id="features" className="container mx-auto px-4 py-16" aria-labelledby="features-heading">
      <h2 id="features-heading" className="text-center text-3xl font-bold tracking-tight text-gray-800 mb-3">
        Everything You Need to Manage Projects Intelligently
      </h2>
      <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
        Zephix packs powerful AI features into an intuitive dashboard so you can focus on strategy, not busy-work.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-gray-200 px-6 py-5 text-center hover:shadow-lg hover:scale-[1.015] transition-all duration-300"
          >
            <div className="mb-4 flex justify-center">{feature.icon}</div>
            <h3 className="text-lg font-bold text-gray-800">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
