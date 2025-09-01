interface Permissions {
  canViewProjects: boolean;
  canManageResources: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
}

interface StatsGridProps {
  permissions: Permissions;
}

export function StatsGrid({ permissions }: StatsGridProps) {
  const stats = [
    {
      name: 'Active Projects',
      value: '12',
      change: '+2.1%',
      show: permissions.canViewProjects,
    },
    {
      name: 'Resource Utilization',
      value: '78%',
      change: '-0.4%',
      show: permissions.canManageResources,
    },
    {
      name: 'Active Risks', 
      value: '3',
      change: '-1',
      show: permissions.canViewProjects,
    },
    {
      name: 'Team Members',
      value: '24',
      change: '+1',
      show: permissions.canManageUsers,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.filter(stat => stat.show).map((stat) => (
        <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

