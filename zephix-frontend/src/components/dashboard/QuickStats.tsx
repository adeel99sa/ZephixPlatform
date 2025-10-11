import { BarChart, Users, FolderKanban, Building2, AlertTriangle } from 'lucide-react';

interface Stats {
  activeUsers: number;
  totalProjects: number;
  workspaces: number;
  atRiskProjects: number;
}

interface QuickStatsProps {
  stats: Stats | null;
  onCreateWorkspace?: () => void;
}

export function QuickStats({ stats, onCreateWorkspace }: QuickStatsProps) {
  if (!stats) {
    return (
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Quick stats
        </h2>
        <EmptyState
          icon={BarChart}
          title="Set up your organization"
          description="Create workspaces and projects to see your stats here"
          action={{ label: "Get Started", onClick: onCreateWorkspace }}
        />
      </section>
    );
  }

  const statCards = [
    { label: 'Active users', value: stats.activeUsers, icon: Users, color: 'blue' },
    { label: 'Total projects', value: stats.totalProjects, icon: FolderKanban, color: 'green' },
    { label: 'Workspaces', value: stats.workspaces, icon: Building2, color: 'purple' },
    { label: 'At-risk projects', value: stats.atRiskProjects, icon: AlertTriangle, color: 'red' }
  ];

  return (
    <section>
      <h2 className="text-sm font-medium text-gray-500 mb-4">
        Quick stats
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value, icon: Icon, color }: { 
  label: string; 
  value: number; 
  icon: any; 
  color: string; 
}) {
  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    red: 'text-red-500'
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <Icon className={`w-4 h-4 ${colorClasses[color as keyof typeof colorClasses]}`} />
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  action?: { label: string; href?: string; onClick?: () => void }; 
}) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && (
        <div className="mt-6">
          {action.onClick ? (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {action.label}
            </button>
          ) : (
            <a
              href={action.href}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {action.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
