// Phase 4.3: Project Health Widget Component
import type { WidgetBaseProps } from "./types";
import { useProjectHealth } from "./hooks";

export function ProjectHealthWidget({ widget, filters }: WidgetBaseProps) {
  const { loading, error, data } = useProjectHealth(filters);

  // Calculate summary metrics
  const totalProjects = data?.length || 0;
  const projectsByStatus = data?.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const totalConflicts = data?.reduce((sum, project) => sum + project.conflictCount, 0) || 0;
  const highRiskProjects = data?.filter((p) => p.riskLevel === "HIGH" || p.riskLevel === "high").length || 0;

  if (loading) {
    return (
      <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Health</h3>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Project Health</h3>
        <p className="text-sm text-red-800">
          Widget data unavailable{error.requestId ? ` (RequestId: ${error.requestId})` : ""}
        </p>
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title || "Project Health"}</h3>

      {/* Primary Numbers */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalProjects}</div>
          <div className="text-xs text-gray-600">Total Projects</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{highRiskProjects}</div>
          <div className="text-xs text-gray-600">High Risk</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">{totalConflicts}</div>
          <div className="text-xs text-gray-600">Conflicts</div>
        </div>
      </div>

      {/* Status Breakdown */}
      {Object.keys(projectsByStatus).length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Status Breakdown</h4>
          <ul className="space-y-1">
            {Object.entries(projectsByStatus).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">{status}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalProjects === 0 && (
        <p className="text-sm text-gray-500">No projects found</p>
      )}
    </div>
  );
}


