import { useAuth } from '@/hooks/useAuth';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentProjects } from '@/components/dashboard/RecentProjects';

export function Dashboard() {
  const { user, permissions } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}
        </h1>
        <div className="text-sm text-gray-500">
          Organization: {user?.organizationId}
        </div>
      </div>

      <StatsGrid permissions={permissions} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions permissions={permissions} />
        <RecentProjects />
      </div>
    </div>
  );
}

