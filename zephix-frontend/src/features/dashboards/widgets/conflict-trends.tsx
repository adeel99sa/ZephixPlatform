// Phase 4.3: Conflict Trends Widget Component
import type { WidgetBaseProps } from "./types";
import { useConflictTrends } from "./hooks";

export function ConflictTrendsWidget({ widget, filters }: WidgetBaseProps) {
  const { loading, error, data } = useConflictTrends(filters);

  // Calculate summary metrics
  const totalConflicts = data?.reduce((sum, item) => sum + item.count, 0) || 0;
  const unresolvedConflicts = totalConflicts; // Backend doesn't track resolved status yet, use total

  if (loading) {
    return (
      <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Conflict Trends</h3>
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
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Conflict Trends</h3>
        <p className="text-sm text-red-800">
          Widget data unavailable{error.requestId ? ` (RequestId: ${error.requestId})` : ""}
        </p>
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title || "Conflict Trends"}</h3>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalConflicts}</div>
          <div className="text-xs text-gray-600">Total Conflicts</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">{unresolvedConflicts}</div>
          <div className="text-xs text-gray-600">Unresolved</div>
        </div>
      </div>

      {/* Week Buckets Table */}
      {data && data.length > 0 ? (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Weekly Trends</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-700">Week</th>
                  <th className="text-right py-2 text-gray-700">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="py-2 text-gray-600">{item.week}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No conflicts found in this period</p>
      )}
    </div>
  );
}


