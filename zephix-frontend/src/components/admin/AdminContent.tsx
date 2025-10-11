import React from 'react';
import { AdminHome } from './sections/AdminHome';
import { UserManagement } from './sections/UserManagement';
import { TeamsManagement } from './sections/TeamsManagement';
import { InvitationsManagement } from './sections/InvitationsManagement';
import { ResourcePolicies } from './sections/ResourcePolicies';
import { RiskRules } from './sections/RiskRules';
import { ProjectTemplates } from './sections/ProjectTemplates';
import { ApprovalWorkflows } from './sections/ApprovalWorkflows';
import { GeneralSettings } from './sections/GeneralSettings';
import { SecuritySettings } from './sections/SecuritySettings';
import { IntegrationsSettings } from './sections/IntegrationsSettings';
import { AuditLogs } from './sections/AuditLogs';
import { BillingManagement } from './sections/BillingManagement';

interface AdminContentProps {
  section: string;
}

export const AdminContent: React.FC<AdminContentProps> = ({ section }) => {
  const renderContent = () => {
    switch (section) {
      case 'home':
        return <AdminHome />;
      
      // People & Teams
      case 'users':
        return <UserManagement />;
      case 'teams':
        return <TeamsManagement />;
      case 'invitations':
        return <InvitationsManagement />;
      
      // Governance
      case 'resource-policies':
        return <ResourcePolicies />;
      case 'risk-rules':
        return <RiskRules />;
      case 'templates':
        return <ProjectTemplates />;
      case 'workflows':
        return <ApprovalWorkflows />;
      
      // Workspace
      case 'general':
        return <GeneralSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'audit':
        return <AuditLogs />;
      
      // Billing
      case 'billing':
        return <BillingManagement />;
      
      default:
        return <AdminHome />;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {renderContent()}
      </div>
    </div>
  );
};













