import type { InboxType } from "../types";

const TYPE_LABELS: Record<InboxType, string> = {
  approval_request: "Approval request",
  task_assignment: "Task assignment",
  dependency_blocked: "Dependency blocked",
  risk_escalation: "Risk escalation",
  governance_alert: "Governance alert",
  comment_mention: "Comment mention",
  document_update: "Document update",
  system_alert: "System alert",
};

export function InboxTypeBadge({ type }: { type: InboxType }) {
  return <span className="zs-badge-neutral">{TYPE_LABELS[type]}</span>;
}

