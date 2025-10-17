// File: src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PortfolioDashboard } from '../../components/dashboard/PortfolioDashboard';
import { MyTasksDashboard } from '../../components/dashboard/MyTasksDashboard';
import { PageHeader } from '@/app/layout/PageHeader';

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Determine user role (admin shows portfolio, others show personal)
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'project_manager';
  
  if (isAdmin) {
    return (
      <div className="p-6">
        <PageHeader 
          title="Analytics Dashboard" 
          description="Track performance, utilization and risk." 
        />
        <PortfolioDashboard />
      </div>
    );
  }
  
  if (isManager) {
    // For now, managers also see personal dashboard
    // In the future, you could create a ProjectsPage component
    return (
      <div className="p-6">
        <PageHeader 
          title="My Dashboard" 
          description="Track your tasks and project progress." 
        />
        <MyTasksDashboard />
      </div>
    );
  }
  
  // Regular users see their tasks
  return (
    <div className="p-6">
      <PageHeader 
        title="My Dashboard" 
        description="Track your tasks and project progress." 
      />
      <MyTasksDashboard />
    </div>
  );
};

export { DashboardPage };