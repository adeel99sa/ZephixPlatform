import { request } from "@/lib/api";

type Envelope<T> = { data: T; meta?: PageMeta };
export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
};

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
  exceptionType: "CAPACITY" | "BUDGET" | "PHASE_GATE" | "OWNER_ASSIGNMENT" | "GOVERNANCE_RULE" | string;
  workspaceId: string;
  workspaceName: string;
  projectId: string | null;
  projectName: string | null;
  reason: string;
  requestedAt: string;
  /** Present on full exception rows from the API (TypeORM). */
  requestedByUserId?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO" | "CONSUMED";
  resolvedByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Present when API returns full exception rows (e.g. task BLOCK metadata). */
  metadata?: Record<string, unknown> | null;
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

/** Row shape from GET /api/admin/workspaces (AdminController.getWorkspaces). */
export type AdminWorkspaceListRow = {
  id: string;
  name: string;
  owner?: { id: string; email?: string | null; name?: string | null } | null;
  visibility?: string;
  status?: string;
  createdAt?: string;
};

/**
 * Maps admin workspace list API rows into WorkspaceSnapshotRow for Admin UI tables.
 * Governance counts are not returned by this endpoint — use neutral placeholders.
 */
export function mapAdminWorkspaceListItemToSnapshotRow(
  raw: AdminWorkspaceListRow,
): WorkspaceSnapshotRow {
  const owner = raw.owner;
  const owners: WorkspaceOwner[] = owner
    ? [
        {
          userId: String(owner.id ?? ""),
          name: (owner.name || owner.email || "Unknown").trim() || "Unknown",
          email: String(owner.email ?? ""),
        },
      ]
    : [];
  const archived = String(raw.status ?? "").toLowerCase() === "archived";
  return {
    workspaceId: String(raw.id ?? ""),
    workspaceName: String(raw.name ?? "Workspace"),
    projectCount: 0,
    budgetStatus: "UNKNOWN",
    capacityStatus: "UNKNOWN",
    openExceptions: 0,
    owners,
    status: archived ? "ARCHIVED" : "ACTIVE",
  };
}

export type UserWorkspaceAccess = {
  workspaceId: string;
  workspaceName: string;
  accessLevel: "workspace_owner" | "delivery_owner" | "contributor" | "viewer";
};

export type AdminTeamMember = {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type AdminTeamSummary = {
  id: string;
  name: string;
  shortCode: string;
  color?: string | null;
  visibility?: string;
  description?: string | null;
  workspaceId?: string | null;
  status: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTeamDetail = AdminTeamSummary & {
  members: AdminTeamMember[];
};

export type AdminDirectoryUser = {
  id: string;
  name: string;
  email: string;
  /** UI dropdown value (owner/admin → admin, pm → member, viewer). */
  role: "admin" | "member" | "viewer" | "owner";
  membershipRole?: string;
  platformRole?: "admin" | "member" | "viewer";
  teams: Array<{ id: string; name: string }>;
  status: "active" | "suspended" | "invited";
  workspaceAccess: UserWorkspaceAccess[];
  lastActiveAt?: string | null;
  joinedAt?: string | null;
  isOwner?: boolean;
};

export type AdminTemplate = {
  id: string;
  name: string;
  status?: "DRAFT" | "APPROVED" | "ARCHIVED";
  updatedAt?: string;
  updatedByUserId?: string | null;
  /** System (Template Center) vs org-owned template — from unified templates list. */
  isSystem?: boolean;
  deliveryMethod?: string | null;
  methodology?: string | null;
};

export type GovernanceRuleCondition = {
  type: string;
  field?: string;
  value?: unknown;
  relatedEntity?: string;
  params?: Record<string, unknown>;
};

export type GovernanceRuleDefinition = {
  when?: { fromStatus?: string; toStatus?: string };
  conditions?: GovernanceRuleCondition[];
  message?: string;
  severity?: string;
};

/** Governance policy row for a template (GET/PATCH template governance). */
export interface GovernancePolicyItem {
  code: string;
  name: string;
  entityType: string;
  enforcementMode: string;
  enabled: boolean;
  ruleDefinition: GovernanceRuleDefinition;
  systemRuleSetId: string;
  templateRuleSetId: string | null;
}

/** Org-wide catalog entry (Governance → Policies overview). */
export interface GovernanceCatalogItem {
  code: string;
  name: string;
  entityType: string;
  enforcementMode: string;
  ruleDefinition: GovernanceRuleDefinition;
  activeOnTemplates: number;
}

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
  actorName?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
};

/** Row from GET /admin/trash (paginated). */
export type AdministrationTrashItem = {
  id: string;
  name: string;
  type: "workspace" | "project" | "task";
  displayType?: string;
  location?: string;
  deletedAt: string;
  deletedByUserId?: string | null;
  deletedByName?: string | null;
  workspaceId?: string | null;
};

// MVP-3A: Workspace member management types
export type WorkspaceMemberRow = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: "owner" | "member" | "viewer";
  createdAt: string;
};

export type OrgMemberOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

function unwrapData<T>(payload: T | Envelope<T> | { __zephixInner: T }): T {
  if (payload && typeof payload === "object" && "__zephixInner" in (payload as any)) {
    return (payload as { __zephixInner: T }).__zephixInner;
  }
  if (payload && typeof payload === "object" && "data" in (payload as any)) {
    return (payload as Envelope<T>).data;
  }
  return payload as T;
}

function unwrapMeta<T>(payload: T | Envelope<T> | { __zephixMeta: PageMeta }): PageMeta | null {
  if (payload && typeof payload === "object" && "__zephixMeta" in (payload as any)) {
    return ((payload as { __zephixMeta: PageMeta }).__zephixMeta || null) as PageMeta | null;
  }
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
    const payload = await request.get<Envelope<AdminWorkspaceListRow[]>>("/admin/workspaces");
    const rows = asArray<AdminWorkspaceListRow>(unwrapData(payload));
    return rows.map(mapAdminWorkspaceListItemToSnapshotRow);
  },

  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{
    data: AdminDirectoryUser[];
    meta: PageMeta | null;
    seatLimit: number | null;
    memberCount: number;
  }> {
    // MVP-2.1 fix: The backend GET /admin/users returns
    // { users: [{id, email, firstName, lastName, role, status, ...}], pagination: {...} }
    // NOT { data: [...] }. The response interceptor passes it through as-is
    // because there's no outer `data` key. We need to:
    //   1. Extract the `users` array from the raw response
    //   2. Transform each user to the AdminDirectoryUser shape (combine
    //      firstName+lastName into `name`, add empty `workspaceAccess`)
    //   3. Extract pagination into the PageMeta format
    const raw = await request.get<any>(`/admin/users${buildQuery(params || {})}`);
    const rawPayload = raw && typeof raw === "object" ? raw : {};
    const usersArr: any[] = Array.isArray(rawPayload.users)
      ? rawPayload.users
      : Array.isArray(rawPayload) // fallback if interceptor unwrapped differently
        ? rawPayload
        : asArray(unwrapData(rawPayload));

    const data: AdminDirectoryUser[] = usersArr.map((u: any) => {
      const ui = String(u.uiRole || "").toLowerCase();
      const pr = String(u.platformRole || "member").toLowerCase();
      const platformOk =
        pr === "admin" || pr === "viewer" || pr === "member" ? pr : "member";
      const roleForRow: AdminDirectoryUser["role"] =
        ui === "owner"
          ? "owner"
          : platformOk === "admin"
            ? "admin"
            : platformOk === "viewer"
              ? "viewer"
              : "member";
      return {
        id: String(u.id ?? ""),
        name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "Unknown",
        email: u.email ?? "",
        role: roleForRow,
        membershipRole: u.membershipRole,
        platformRole: platformOk as "admin" | "member" | "viewer",
        teams: Array.isArray(u.teams) ? u.teams : [],
        status: (u.status ?? "active") as AdminDirectoryUser["status"],
        workspaceAccess: Array.isArray(u.workspaceAccess) ? u.workspaceAccess : [],
        lastActiveAt: u.lastActive ?? null,
        joinedAt: u.joinedAt ?? null,
        isOwner: Boolean(u.isOwner),
      };
    });

    const pag = rawPayload.pagination;
    const meta: PageMeta | null = pag
      ? {
          page: pag.page ?? 1,
          limit: pag.limit ?? 20,
          total: pag.total ?? data.length,
          totalPages: pag.totalPages,
        }
      : null;

    const seatRaw = rawPayload.seatLimit;
    const seatLimit =
      seatRaw !== undefined && seatRaw !== null && Number.isFinite(Number(seatRaw))
        ? Number(seatRaw)
        : null;
    const memberCount =
      typeof rawPayload.memberCount === "number" ? rawPayload.memberCount : meta?.total ?? data.length;

    return { data, meta, seatLimit, memberCount };
  },

  async getOrgTemplate(templateId: string): Promise<Record<string, unknown>> {
    return request.get(`/admin/templates/${templateId}`);
  },

  async patchOrgTemplate(
    templateId: string,
    patch: { columnConfig?: Record<string, boolean> },
  ): Promise<Record<string, unknown>> {
    return request.patch(`/admin/templates/${templateId}`, patch);
  },

  async listAdminTeams(params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    workspaceId?: string;
  }): Promise<AdminTeamSummary[]> {
    const rows = await request.get<AdminTeamSummary[]>(`/admin/teams${buildQuery(params || {})}`);
    return asArray(rows);
  },

  async getAdminTeam(teamId: string): Promise<AdminTeamDetail> {
    return request.get<AdminTeamDetail>(`/admin/teams/${teamId}`);
  },

  async createAdminTeam(body: {
    name: string;
    shortCode: string;
    description?: string;
    visibility?: string;
    color?: string;
    workspaceId?: string;
  }): Promise<AdminTeamSummary> {
    return request.post<AdminTeamSummary>(`/admin/teams`, {
      ...body,
      visibility: body.visibility ?? "public",
    });
  },

  async updateAdminTeam(
    teamId: string,
    body: Partial<{
      name: string;
      shortCode: string;
      description: string;
      visibility: string;
      color: string;
      workspaceId: string;
      status: string;
    }>,
  ): Promise<AdminTeamSummary> {
    return request.patch<AdminTeamSummary>(`/admin/teams/${teamId}`, body);
  },

  async deleteAdminTeam(teamId: string): Promise<AdminTeamSummary> {
    return request.delete<AdminTeamSummary>(`/admin/teams/${teamId}`);
  },

  async addTeamMember(teamId: string, userId: string): Promise<AdminTeamDetail> {
    return request.post<AdminTeamDetail>(`/admin/teams/${teamId}/members`, { userId });
  },

  async removeTeamMember(teamId: string, userId: string): Promise<AdminTeamDetail> {
    return request.delete<AdminTeamDetail>(`/admin/teams/${teamId}/members/${userId}`);
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
    _reason?: string | null,
  ): Promise<void> {
    await request.delete(`/admin/users/${userId}`);
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

  async getTemplateGovernance(templateId: string): Promise<GovernancePolicyItem[]> {
    const payload = await request.get<Envelope<GovernancePolicyItem[]>>(
      `/admin/templates/${templateId}/governance`,
    );
    return asArray(unwrapData(payload));
  },

  async updateTemplateGovernance(
    templateId: string,
    toggles: Record<string, boolean>,
  ): Promise<GovernancePolicyItem[]> {
    const payload = await request.patch<Envelope<GovernancePolicyItem[]>>(
      `/admin/templates/${templateId}/governance`,
      toggles,
    );
    return asArray(unwrapData(payload));
  },

  async getGovernanceCatalog(): Promise<GovernanceCatalogItem[]> {
    const payload = await request.get<Envelope<GovernanceCatalogItem[]>>(
      `/admin/governance-rules/catalog`,
    );
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
    actorId?: string;
    dateRange?: string;
    eventCategory?: string;
    search?: string;
  }): Promise<{ data: AdminAuditEvent[]; meta: PageMeta | null }> {
    const payload = await request.get<any>(`/admin/audit${buildQuery(params || {})}`);
    const rawRows = asArray<any>(unwrapData(payload));
    const data: AdminAuditEvent[] = rawRows.map((row) => ({
      id: String(row.id ?? ""),
      createdAt: String(row.createdAt ?? ""),
      actorUserId: row.actorUserId ?? null,
      actorName: row.actorName ?? null,
      action: String(row.action ?? ""),
      entityType: String(row.entityType ?? ""),
      entityId: String(row.entityId ?? ""),
      description:
        typeof row.description === "string" && row.description.trim()
          ? row.description.trim()
          : `${String(row.action ?? "event")} on ${String(row.entityType ?? "record")}`,
    }));
    return { data, meta: unwrapMeta(payload) };
  },

  // ── MVP-3A: Workspace Member Management ──────────────────────────
  // Calls AdminWorkspaceMembersController endpoints at
  // /workspaces/:workspaceId/members (NOT /admin/workspaces/...).
  // Admin-only via @RequireOrgRole(ADMIN) guard on backend.
  // Role values are simplified: 'owner' | 'member' | 'viewer'.

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    const payload = await request.get<any>(`/workspaces/${workspaceId}/members`);
    const raw = payload && typeof payload === "object" ? payload : {};
    const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : asArray(unwrapData(raw));
    return arr.map((m: any) => ({
      id: String(m.id ?? ""),
      userId: String(m.userId ?? m.user_id ?? ""),
      email: String(m.email ?? ""),
      name: String(m.name ?? m.email ?? "Unknown"),
      role: (m.role ?? "member") as WorkspaceMemberRow["role"],
      createdAt: String(m.createdAt ?? m.created_at ?? ""),
    }));
  },

  async addWorkspaceMember(
    workspaceId: string,
    input: { userId: string; role: "owner" | "member" | "viewer" },
  ): Promise<{ id: string }> {
    const payload = await request.post<Envelope<{ id: string }>>(
      `/workspaces/${workspaceId}/members`,
      { userId: input.userId, role: `workspace_${input.role}` },
    );
    return unwrapData(payload);
  },

  async updateWorkspaceMemberRole(
    workspaceId: string,
    memberId: string,
    role: "owner" | "member" | "viewer",
  ): Promise<{ success: boolean }> {
    const payload = await request.patch<Envelope<{ success: boolean }>>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      { role: `workspace_${role}` },
    );
    return unwrapData(payload);
  },

  async removeWorkspaceMember(
    workspaceId: string,
    memberId: string,
  ): Promise<{ success: boolean }> {
    const payload = await request.delete<Envelope<{ success: boolean }>>(
      `/workspaces/${workspaceId}/members/${memberId}`,
    );
    return unwrapData(payload);
  },

  async listOrgMembersForAssignment(): Promise<OrgMemberOption[]> {
    const result = await this.listUsers({ limit: 200 });
    return result.data.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    }));
  },

  async getTrashItems(params: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }): Promise<{ data: AdministrationTrashItem[]; meta: PageMeta | null }> {
    const query = buildQuery({
      page: params.page,
      limit: params.limit,
      type: params.type,
      search: params.search,
    });
    const payload = await request.get<unknown>(`/admin/trash${query}`);
    return {
      data: asArray<AdministrationTrashItem>(unwrapData(payload)),
      meta: unwrapMeta(payload),
    };
  },

  async restoreTrashItem(kind: string, id: string): Promise<{ restored: boolean; type: string; id: string }> {
    const payload = await request.post<Envelope<{ restored: boolean; type: string; id: string }>>(
      `/admin/trash/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/restore`,
    );
    return unwrapData(payload);
  },

  async permanentlyDeleteTrashItem(kind: string, id: string): Promise<{ deleted: boolean; type: string; id: string }> {
    const payload = await request.delete<Envelope<{ deleted: boolean; type: string; id: string }>>(
      `/admin/trash/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,
    );
    return unwrapData(payload);
  },

  async clearAllTrash(): Promise<{
    cleared: boolean;
    counts: { tasks: number; projects: number; workspaces: number };
  }> {
    const payload = await request.delete<
      Envelope<{ cleared: boolean; counts: { tasks: number; projects: number; workspaces: number } }>
    >("/admin/trash");
    return unwrapData(payload);
  },
};
