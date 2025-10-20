import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppShell } from './app/AppShell';

// Lazy load all pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./features/projects/pages/ProjectDetailPage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const ResourcesPage = lazy(() => import('./pages/resources/ResourcesPage'));
const RisksPage = lazy(() => import('./pages/risks/RisksPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

// Loading fallback component
const PageSkeleton = () => (
  <div className="p-6 space-y-4">
    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
    <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
    <div className="space-y-2">
      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
    </div>
  </div>
);

export const AppRoutes = () => {
  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Dashboard */}
          <Route path="/app/dashboard" element={<DashboardPage />} />
          
          {/* Projects */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          
          {/* Tasks */}
          <Route path="/tasks" element={<TasksPage />} />
          
          {/* Resources */}
          <Route path="/resources" element={<ResourcesPage />} />
          
          {/* Risks */}
          <Route path="/risks" element={<RisksPage />} />
          
          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />
          
          {/* Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />
          
          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Redirect root app path to dashboard */}
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
};