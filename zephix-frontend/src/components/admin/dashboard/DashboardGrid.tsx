import React from 'react';
import { SystemHealthCard } from './SystemHealthCard';
import { UserStatisticsCard } from './UserStatisticsCard';
import { GovernanceCard } from './GovernanceCard';
import { UsageMetricsCard } from './UsageMetricsCard';
import { QuickActionsCard } from './QuickActionsCard';
import { mockDashboardData } from '../../../mocks/adminData';

export const DashboardGrid: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SystemHealthCard data={mockDashboardData.systemHealth} />
        <UserStatisticsCard data={mockDashboardData.userStats} />
        <GovernanceCard data={mockDashboardData.governance} />
        <UsageMetricsCard 
          title="User Activity"
          data={mockDashboardData.usage.users}
          type="line"
        />
        <UsageMetricsCard 
          title="Storage Usage"
          data={mockDashboardData.usage.storage}
          type="bar"
        />
        <QuickActionsCard />
      </div>
    </div>
  );
};
