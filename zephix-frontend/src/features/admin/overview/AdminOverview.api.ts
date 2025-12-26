import { api } from "@/lib/api";

export interface OrgSummary {
  name: string;
  id: string;
  slug?: string;
  totalUsers: number;
  totalWorkspaces: number;
}

export interface UserSummary {
  total: number;
  byRole: {
    owners: number;
    admins: number;
    members: number;
    viewers: number;
  };
}

export interface WorkspaceSummary {
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

export interface AdminSummary {
  org: OrgSummary;
  users: UserSummary;
  workspaces: WorkspaceSummary;
  risk: RiskSummary;
}

export const adminOverviewApi = {
  async getSummary(): Promise<AdminSummary> {
    const [orgResponse, usersResponse, workspacesResponse, riskResponse] = await Promise.all([
      api.get<{ data: OrgSummary }>("/admin/org/summary").catch(() => ({
        data: {
          name: "Organization",
          id: "unknown",
          totalUsers: 0,
          totalWorkspaces: 0,
        } as OrgSummary,
      })),
      api.get<{ data: UserSummary }>("/admin/users/summary").catch(() => ({
        data: {
          total: 0,
          byRole: {
            owners: 0,
            admins: 0,
            members: 0,
            viewers: 0,
          },
        } as UserSummary,
      })),
      api.get<{ data: WorkspaceSummary }>("/admin/workspaces/summary").catch(() => ({
        data: {
          total: 0,
          byType: {
            public: 0,
            private: 0,
          },
          byStatus: {
            active: 0,
            archived: 0,
          },
        } as WorkspaceSummary,
      })),
      api.get<{ data: RiskSummary }>("/admin/risk/summary").catch(() => ({
        data: {
          projectsAtRisk: 0,
          overallocatedResources: 0,
        } as RiskSummary,
      })),
    ]);

    // Backend returns { data: ... }, extract data field
    const org = orgResponse?.data || orgResponse;
    const users = usersResponse?.data || usersResponse;
    const workspaces = workspacesResponse?.data || workspacesResponse;
    const risk = riskResponse?.data || riskResponse;

    return {
      org: org as OrgSummary,
      users: users as UserSummary,
      workspaces: workspaces as WorkspaceSummary,
      risk: risk as RiskSummary,
    };
  },
};

