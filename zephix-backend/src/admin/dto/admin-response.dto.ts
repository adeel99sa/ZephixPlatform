// Admin service return type DTOs

export interface AdminStatistics {
  userCount: number;
  activeUsers: number;
  templateCount: number;
  projectCount: number;
  totalItems: number;
}

export interface SystemHealth {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'ok' | 'error';
  services?: {
    userService: string;
    projectService: string;
    workflowService: string;
  };
  details?: {
    message: string;
  };
}

export interface OrgSummary {
  name: string;
  id: string;
  slug: string;
  totalUsers: number;
  totalWorkspaces: number;
}

export interface UsersSummary {
  total: number;
  byRole: {
    owners: number;
    admins: number;
    members: number;
    viewers: number;
  };
}

export interface WorkspacesSummary {
  total: number;
  byType: {
    public: number;
    private: number;
  };
  byStatus: {
    active: number;
    archived: number;
  };
}

export interface RiskSummary {
  projectsAtRisk: number;
  overallocatedResources: number;
}
