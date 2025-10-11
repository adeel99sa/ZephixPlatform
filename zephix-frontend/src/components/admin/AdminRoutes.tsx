import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './sections/AdminDashboard';
import { UserManagement } from './sections/UserManagement';
import { WorkspaceSettings } from './sections/WorkspaceSettings';
import { BillingSettings } from './sections/BillingSettings';
import { SecuritySettings } from './sections/SecuritySettings';
import { ResourcePolicy } from './sections/ResourcePolicy';
import { ProjectTemplates } from './sections/ProjectTemplates';
import { ApprovalWorkflows } from './sections/ApprovalWorkflows';

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/teams" element={<div>Teams Management - Coming Soon</div>} />
      <Route path="/permissions" element={<div>Roles & Permissions - Coming Soon</div>} />
      <Route path="/settings" element={<WorkspaceSettings />} />
      <Route path="/billing" element={<BillingSettings />} />
      <Route path="/security" element={<SecuritySettings />} />
      <Route path="/resource-policy" element={<ResourcePolicy />} />
      <Route path="/templates" element={<ProjectTemplates />} />
      <Route path="/workflows" element={<ApprovalWorkflows />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
