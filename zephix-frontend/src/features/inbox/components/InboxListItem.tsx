import { AlertTriangle, BellRing, CheckSquare, MessageSquare, ShieldAlert } from "lucide-react";
import type { InboxItem } from "../types";
import { InboxSeverityBadge } from "./InboxSeverityBadge";
import { InboxTypeBadge } from "./InboxTypeBadge";

type InboxListItemProps = {
  item: InboxItem;
  selected: boolean;
  onClick: () => void;
};

function iconForType(type: InboxItem["type"]) {
  switch (type) {
    case "approval_request":
      return <ShieldAlert className="h-4 w-4 text-amber-600" />;
    case "task_assignment":
      return <CheckSquare className="h-4 w-4 text-blue-600" />;
    case "dependency_blocked":
      return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    case "comment_mention":
      return <MessageSquare className="h-4 w-4 text-violet-600" />;
    default:
      return <BellRing className="h-4 w-4 text-slate-600" />;
  }
}

export function InboxListItem({ item, selected, onClick }: InboxListItemProps) {
  return (
    <button
      className={`w-full rounded-lg border p-3 text-left transition ${
        selected
          ? "border-blue-300 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {iconForType(item.type)}
          <InboxTypeBadge type={item.type} />
          <InboxSeverityBadge severity={item.severity} />
        </div>
        <div className="text-xs text-slate-500">{new Date(item.time).toLocaleString()}</div>
      </div>
      <div className="flex items-center gap-2">
        {!item.read ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}
        <p className={`text-sm ${!item.read ? "font-semibold text-slate-900" : "text-slate-800"}`}>
          {item.title}
        </p>
      </div>
      {item.summary ? <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.summary}</p> : null}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{item.sourceProjectName || item.sourceSurface}</span>
        <span className="uppercase tracking-wide">{item.status}</span>
      </div>
    </button>
  );
}

