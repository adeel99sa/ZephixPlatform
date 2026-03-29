export type InboxTab = "primary" | "other" | "later" | "cleared";
export type InboxType =
  | "approval_request"
  | "task_assignment"
  | "dependency_blocked"
  | "risk_escalation"
  | "governance_alert"
  | "comment_mention"
  | "document_update"
  | "system_alert";
export type InboxSeverity = "low" | "medium" | "high";
export type InboxStatus = "unread" | "read" | "later" | "cleared";

export type InboxAction = "open_source" | "mark_read" | "move_later" | "clear";

export interface InboxItem {
  id: string;
  tab: InboxTab;
  type: InboxType;
  title: string;
  summary: string | null;
  sourceProjectId: string | null;
  sourceProjectName: string | null;
  sourceWorkspaceId: string | null;
  sourceSurface: string;
  time: string;
  status: InboxStatus;
  severity: InboxSeverity;
  read: boolean;
  actionRequired: boolean;
  availableActions: InboxAction[];
  deepLink: string | null;
  metadata: Record<string, unknown>;
}

export interface InboxListResponse {
  items: InboxItem[];
  total: number;
}

export interface InboxFilterOptions {
  types: InboxType[];
  severities: InboxSeverity[];
  statuses: InboxStatus[];
  projects: Array<{ id: string; name: string }>;
}

