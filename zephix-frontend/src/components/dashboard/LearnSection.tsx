import { useState } from 'react';
import { Clock, X } from 'lucide-react';

const learningResources = [
  { title: 'Set up your first workspace', duration: '2m', href: '/learn/workspace' },
  { title: 'Invite team members', duration: '1m', href: '/learn/invite' },
  { title: 'Create project from template', duration: '3m', href: '/learn/templates' },
  { title: 'Understanding roles & permissions', duration: '5m', href: '/learn/permissions' }
];

export function LearnSection() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-500">Learn</h2>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {learningResources.map(resource => (
          <LearnCard key={resource.title} {...resource} />
        ))}
      </div>
    </section>
  );
}

function LearnCard({ title, duration, href }: { 
  title: string; 
  duration: string; 
  href: string; 
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-1 mt-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{duration}</span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
        </div>
      </div>
    </a>
  );
}




