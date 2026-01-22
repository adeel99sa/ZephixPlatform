// Phase 4.3: Resource Utilization Widget Component
import type { WidgetBaseProps } from "./types";
import { useResourceUtilization } from "./hooks";

export function ResourceUtilizationWidget({ widget, filters }: WidgetBaseProps) {
  const { loading, error, data } = useResourceUtilization(filters);

  // Calculate summary metrics
  const totalResources = data?.length || 0;
  const avgUtilization = data && data.length > 0
    ? Math.round(data.reduce((sum, r) => sum + r.utilizationPercentage, 0) / data.length)
    : 0;
  const overAllocated = data?.filter((r) => r.utilizationPercentage > 100) || [];
  const topOverAllocated = overAllocated
    .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Resource Utilization</h3>
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
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Resource Utilization</h3>
        <p className="text-sm text-red-800">
          Widget data unavailable{error.requestId ? ` (RequestId: ${error.requestId})` : ""}
        </p>
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title || "Resource Utilization"}</h3>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalResources}</div>
          <div className="text-xs text-gray-600">Total Resources</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-indigo-600">{avgUtilization}%</div>
          <div className="text-xs text-gray-600">Avg Utilization</div>
        </div>
      </div>

      {/* Top 5 Over-allocated Resources */}
      {topOverAllocated.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Top Over-allocated Resources</h4>
          <ul className="space-y-2">
            {topOverAllocated.map((resource) => (
              <li key={resource.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate flex-1">{resource.displayName}</span>
                <span className={`font-medium ml-2 ${
                  resource.utilizationPercentage > 150 ? "text-red-600" :
                  resource.utilizationPercentage > 120 ? "text-orange-600" :
                  "text-yellow-600"
                }`}>
                  {resource.utilizationPercentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalResources === 0 && (
        <p className="text-sm text-gray-500">No resources found</p>
      )}
    </div>
  );
}


