/**
 * Contract for the Projects At Risk widget (aligns with future
 * GET /workspaces/:workspaceId/dashboard/projects-at-risk).
 */
export type ProjectsAtRiskLevel = 'critical' | 'warning' | 'healthy';

export interface ProjectsAtRiskRow {
  id: string;
  name: string;
  riskLevel: ProjectsAtRiskLevel;
  /** Schedule Performance Index — absent until EVM API lands */
  spi?: number | null;
  /** Cost Performance Index */
  cpi?: number | null;
  daysOverdue: number;
  blockedProjects: string[];
  primaryRisk?: string | null;
}

export interface ProjectsAtRiskWidgetData {
  totalProjects: number;
  atRiskCount: number;
  projects: ProjectsAtRiskRow[];
}

/** Demo payload for beta / Storybook / env-gated dev (`VITE_MOCK_PROJECTS_AT_RISK=true`). */
export const MOCK_PROJECTS_AT_RISK_DATA: ProjectsAtRiskWidgetData = {
  totalProjects: 12,
  atRiskCount: 3,
  projects: [
    {
      id: 'mock-proj-1',
      name: 'API Rewrite',
      riskLevel: 'critical',
      spi: 0.87,
      cpi: 0.95,
      daysOverdue: 2,
      blockedProjects: ['Mobile', 'Web'],
      primaryRisk: 'Vendor API SLA breach',
    },
    {
      id: 'mock-proj-2',
      name: 'Mobile Launch',
      riskLevel: 'warning',
      spi: 0.94,
      cpi: 1.02,
      daysOverdue: 0,
      blockedProjects: [],
      primaryRisk: 'Dependency on API Rewrite',
    },
    {
      id: 'mock-proj-3',
      name: 'Q3 Marketing',
      riskLevel: 'warning',
      spi: 1.0,
      cpi: 0.92,
      daysOverdue: 0,
      blockedProjects: [],
      primaryRisk: 'Creative agency overrun',
    },
  ],
};
