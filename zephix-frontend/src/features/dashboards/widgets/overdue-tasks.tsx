// Phase 4.3: Overdue Tasks Widget — tasks past due from work tasks API
import { useNavigate } from "react-router-dom";
import type { WidgetBaseProps } from "./types";
import { useOverdueTasks } from "./hooks";

export function OverdueTasksWidget({ widget }: WidgetBaseProps) {
  const navigate = useNavigate();
  const { loading, error, data } = useOverdueTasks();

  const items = data?.items || [];
  const total = data?.total ?? 0;

  if (loading) {
    return (
      <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {widget.title || "Overdue Tasks"}
        </h3>
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          {widget.title || "Overdue Tasks"}
        </h3>
        <p className="text-sm text-red-800">
          Widget data unavailable{error.requestId ? ` (RequestId: ${error.requestId})` : ""}
        </p>
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 border rounded-lg flex flex-col items-center justify-center min-h-[120px]" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          {widget.title || "Overdue Tasks"}
        </h3>
        <div className="text-2xl mb-1">✅</div>
        <p className="text-sm font-medium text-gray-700">No overdue tasks</p>
        <small className="text-xs text-gray-500">All tasks are on track or completed</small>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {widget.title || "Overdue Tasks"}
        </h3>
        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          {total} overdue
        </span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 10).map((task) => (
          <div
            key={task.id}
            className={`flex flex-col gap-1 p-2 rounded-lg border cursor-pointer transition-colors ${
              task.daysOverdue > 7
                ? "border-red-200 bg-red-50/50 hover:bg-red-50"
                : "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
            }`}
            onClick={() => navigate(`/projects/${task.projectId}?taskId=${task.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" && navigate(`/projects/${task.projectId}?taskId=${task.id}`)
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 shrink-0">
                {task.daysOverdue === 0
                  ? "Today"
                  : task.daysOverdue === 1
                    ? "1 day"
                    : `${task.daysOverdue} days`}
              </span>
            </div>
            {task.projectName && (
              <span className="text-xs text-gray-600 truncate">{task.projectName}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
