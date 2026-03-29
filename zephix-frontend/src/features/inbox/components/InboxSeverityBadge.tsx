import type { InboxSeverity } from "../types";

export function InboxSeverityBadge({ severity }: { severity: InboxSeverity }) {
  if (severity === "high") return <span className="zs-badge-danger">High</span>;
  if (severity === "low") return <span className="zs-badge-neutral">Low</span>;
  return <span className="zs-badge-warning">Medium</span>;
}

