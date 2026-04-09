import { request } from "@/lib/api";

type Envelope<T> = { data: T; meta?: PageMeta };
export type PageMeta = { page: number; limit: number; total: number };

export type GovernanceDecision = {
  id: string;
  type: "CAPACITY_EXCEPTION" | "BUDGET_EXCEPTION" | "PHASE_GATE" | "OWNER_ASSIGNMENT" | string;
  workspaceId: string;
  workspaceName: string;
  projectId: string | null;
  projectName: string | null;
  reason: string;
  requestedByUserId: string;
  requestedAt: string;
  ageHours: number;
  status: "PENDING";
};

export type GovernanceQueueItem = {
  id: string;
  exceptionType: "CAPACITY" | "BUDGET" | "PHASE_GATE" | "OWNER_ASSIGNMENT" | string;
  workspaceId: string;
  workspaceName: string;
  projectId: string | null;
  projectName: string | null;
  reason: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO";
};

export type GovernanceApproval = {
  id: string;
  type: string;
  workspaceId: string;
  projectId: string | null;
  requestedAt: string;
  status: "PENDING" | "COMPLETED";
  requiredApprovals: number;
  receivedApprovals: number;
};

export type GovernanceHealth = {
  activePolicies: number;
  capacityWarnings: number;
  budgetWarnings: number;
  hardBlocksThisWeek: number;
};

export type GovernanceActivityEvent = {
  id: string;
  timestamp: string;
  eventType: string;
  description: string;
  actorUserId: string | null;
  actorName: string | null;
};

export type WorkspaceOwner = { userId: string; name: string; email: string };
export type WorkspaceSnapshotRow = {
  workspaceId: string;
  workspaceName: string;
  projectCount: number;
  budgetStatus: "OK" | "WARNING" | "BLOCKED" | "UNKNOWN";
  capacityStatus: "OK" | "WARNING" | "BLOCKED" | "UNKNOWN";
  openExceptions: number;
  owners: WorkspaceOwner[];
  status: "ACTIVE" | "ARCHIVED";
};

export type UserWorkspaceAccess = {
  workspaceId: string;
  workspaceName: string;
  accessLevel: "workspace_owner" | "delivery_owner" | "contributor" | "viewer";
};

export type AdminDirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer" | "owner";
  status: "active" | "inactive";
  workspaceAccess: UserWorkspaceAccess[];
};

export type AdminTemplate = {
  id: string;
  name: string;
  status: "DRAFT" | "APPROVED" | "ARCHIVED";
  updatedAt: string;
  updatedByUserId: string | null;
};

export type BillingSummary = {
  currentPlan: "free" | "team" | "enterprise" | "custom" | string;
  planStatus: "active" | "past_due" | "canceled" | string;
  renewalDate: string | null;
  usage: {
    activeUsers: number;
    workspaces: number;
    storageBytesUsed: number;
  };
};

export type BillingInvoice = {
  invoiceId: string;
  periodStart: string;
  periodEnd: string;
  amountCents: number;
  currency: string;
  status: "paid" | "open" | "void" | string;
  issuedAt: string;
};

export type AdminAuditEvent = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  action: string;
  description: string;
};

function unwrapData<T>(payload: T | Envelope<T>): T {
  if (payload && typeof payload === "object" && "data" in (payload as any)) {
    return (payload as Envelope<T>).data;
  }
  return payload as T;
}

function unwrapMeta<T>(payload: T | Envelope<T>): PageMeta | null {
  if (payload && typeof payload === "object" && "meta" in (payload as any)) {
    return ((payload as Envelope<T>).meta || null) as PageMeta | null;
  }
  return null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });
  return qs.toString() ? `?${qs.toString()}` : "";
}

export const administrationApi = {
  async listPendingDecisions(params?: {
    page?: number;
    limit?: number;
    workspaceId?: string;
    projectId?: string;
    type?: string;
  }): Promise<{ data: GovernanceDecision[]; meta: PageMeta | null }> {
    const query = buildQuery(params || {});
    const payload = await request.get<Envelope<GovernanceDecision[]>>(
      `/admin/governance/decisions/pending${query}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },

  async getGovernanceHealth(): Promise<GovernanceHealth> {
    const payload = await request.get<Envelope<GovernanceHealth>>("/admin/governance/health");
    return unwrapData(payload);
  },

  async listGovernanceQueue(params?: {
    page?: number;
    limit?: number;
    workspaceId?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO";
  }): Promise<{ data: GovernanceQueueItem[]; meta: PageMeta | null }> {
    const query = buildQuery(params || {});
    const payload = await request.get<Envelope<GovernanceQueueItem[]>>(
      `/admin/governance/exceptions${query}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },

  async listGovernanceApprovals(params?: {
    page?: number;
    limit?: number;
    status?: "PENDING" | "COMPLETED";
  }): Promise<{ data: GovernanceApproval[]; meta: PageMeta | null }> {
    const query = buildQuery(params || {});
    const payload = await request.get<Envelope<GovernanceApproval[]>>(
      `/admin/governance/approvals${query}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },

  async approveException(id: string, comment?: string | null): Promise<{ id: string; status: "APPROVED"; updatedAt: string }> {
    const payload = await request.post<Envelope<{ id: string; status: "APPROVED"; updatedAt: string }>>(
      `/admin/governance/exceptions/${id}/approve`,
      { comment: comment ?? null },
    );
    return unwrapData(payload);
  },

  async rejectException(id: string, reason: string, comment?: string | null): Promise<{ id: string; status: "REJECTED"; updatedAt: string }> {
    const payload = await request.post<Envelope<{ id: string; status: "REJECTED"; updatedAt: string }>>(
      `/admin/governance/exceptions/${id}/reject`,
      { reason, comment: comment ?? null },
    );
    return unwrapData(payload);
  },

  async requestMoreInfo(id: string, question: string, comment?: string | null): Promise<{ id: string; status: "NEEDS_INFO"; updatedAt: string }> {
    const payload = await request.post<Envelope<{ id: string; status: "NEEDS_INFO"; updatedAt: string }>>(
      `/admin/governance/exceptions/${id}/request-info`,
      { question, comment: comment ?? null },
    );
    return unwrapData(payload);
  },

  async listRecentActivity(limit = 20): Promise<GovernanceActivityEvent[]> {
    const payload = await request.get<Envelope<GovernanceActivityEvent[]>>(
      `/admin/governance/activity/recent${buildQuery({ limit })}`,
    );
    return asArray(unwrapData(payload));
  },

  async getWorkspaceSnapshot(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: WorkspaceSnapshotRow[]; meta: PageMeta | null }> {
    const payload = await request.get<Envelope<WorkspaceSnapshotRow[]>>(
      `/admin/workspaces/snapshot${buildQuery(params || {})}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },

  async listWorkspaces(): Promise<WorkspaceSnapshotRow[]> {
    const payload = await request.get<Envelope<WorkspaceSnapshotRow[]>>("/admin/workspaces");
    return asArray(unwrapData(payload));
  },

  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ data: AdminDirectoryUser[]; meta: PageMeta | null }> {
    const payload = await request.get<Envelope<AdminDirectoryUser[]>>(
      `/admin/users${buildQuery(params || {})}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },

  async changeUserRole(
    userId: string,
    role: "admin" | "member" | "viewer",
  ): Promise<{ userId: string; role: "admin" | "member" | "viewer"; updatedAt: string }> {
    const payload = await request.patch<Envelope<{ userId: string; role: "admin" | "member" | "viewer"; updatedAt: string }>>(
      `/admin/users/${userId}/role`,
      { role },
    );
    return unwrapData(payload);
  },

  async deactivateUser(
    userId: string,
    reason?: string | null,
  ): Promise<{ userId: string; status: "inactive"; updatedAt: string }> {
    const payload = await request.post<Envelope<{ userId: string; status: "inactive"; updatedAt: string }>>(
      `/admin/users/${userId}/deactivate`,
      { reason: reason ?? null },
    );
    return unwrapData(payload);
  },

  async inviteUsers(input: {
    emails: string[];
    // Admin Console MVP-1 — canonical platform role vocabulary per spec §3.3.
    // Guest is renamed to Viewer everywhere in the administration feature.
    // The backend `normalizePlatformRole` accepts both values during the
    // transition; the migration to canonical DB values (§9.3) is deferred
    // to a separate cleanup PR.
    platformRole: "Admin" | "Member" | "Viewer";
    workspaceAssignments?: Array<{ workspaceId: string; accessLevel: "Member" | "Viewer" }>;
  }): Promise<{ results: Array<{ email: string; status: "success" | "error"; message?: string }> }> {
    const payload = await request.post<
      Envelope<{ results: Array<{ email: string; status: "success" | "error"; message?: string }> }>
    >("/admin/organization/users/invite", input);
    return unwrapData(payload);
  },

  async listTemplates(): Promise<AdminTemplate[]> {
    const payload = await request.get<Envelope<AdminTemplate[]>>("/admin/templates");
    return asArray(unwrapData(payload));
  },

  async getBillingSummary(): Promise<BillingSummary> {
    const payload = await request.get<Envelope<BillingSummary>>("/admin/billing/summary");
    return unwrapData(payload);
  },

  async getBillingInvoices(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: BillingInvoice[]; meta: PageMeta | null }> {
    const payload = await request.get<Envelope<BillingInvoice[]>>(
      `/admin/billing/invoices${buildQuery(params || {})}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },

  async listAuditEvents(params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
  }): Promise<{ data: AdminAuditEvent[]; meta: PageMeta | null }> {
    const payload = await request.get<Envelope<AdminAuditEvent[]>>(
      `/admin/audit${buildQuery(params || {})}`,
    );
    return { data: asArray(unwrapData(payload)), meta: unwrapMeta(payload) };
  },
};
