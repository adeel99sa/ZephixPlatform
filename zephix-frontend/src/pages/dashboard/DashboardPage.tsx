// File: src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PortfolioDashboard } from '../../components/dashboard/PortfolioDashboard';
import { MyTasksDashboard } from '../../components/dashboard/MyTasksDashboard';
import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/card/Card';
import { Skeleton } from '../../components/ui/feedback/Skeleton';

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Determine user role (admin shows portfolio, others show personal)
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'project_manager';
  
  if (isAdmin) {
    return (
      <div>
        <PageHeader
          title="Portfolio Overview"
          description="Monitor project performance and portfolio health"
        />
        <PortfolioDashboard />
      </div>
    );
  }
  
  if (isManager) {
    return (
      <div>
        <PageHeader
          title="Manager Dashboard"
          description="Track your projects and team performance"
        />
        <MyTasksDashboard />
      </div>
    );
  }
  
  // Regular users see their tasks
  return (
    <div>
      <PageHeader
        title="My Dashboard"
        description="Track your tasks and project assignments"
      />
      <MyTasksDashboard />
    </div>
  );
};

export { DashboardPage };