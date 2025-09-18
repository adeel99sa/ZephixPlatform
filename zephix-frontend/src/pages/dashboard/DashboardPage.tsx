// File: src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PortfolioDashboard } from '../../components/dashboard/PortfolioDashboard';
import { MyTasksDashboard } from '../../components/dashboard/MyTasksDashboard';

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Determine user role (admin shows portfolio, others show personal)
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'project_manager';
  
  if (isAdmin) {
    return <PortfolioDashboard />;
  }
  
  if (isManager) {
    // For now, managers also see personal dashboard
    // In the future, you could create a ProjectsPage component
    return <MyTasksDashboard />;
  }
  
  // Regular users see their tasks
  return <MyTasksDashboard />;
};

export { DashboardPage };