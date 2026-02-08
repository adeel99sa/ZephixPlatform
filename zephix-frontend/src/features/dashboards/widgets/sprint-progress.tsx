/**
 * Sprint Progress Dashboard Widget
 *
 * Shows:
 *  - Headline numbers: completed/total points, percent complete
 *  - Mini burndown sparkline (7-day sample)
 *  - Sprint status badge and scope mode label
 */
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from "recharts";
import {
  getSprintProgress,
  type SprintProgress,
} from "@/features/work-management/sprints.api";
import type { DashboardWidget } from "../types";

interface Props {
  widget: DashboardWidget;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export function SprintProgressWidget({ widget }: Props) {
  const [data, setData] = useState<SprintProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sprintId = widget.config?.sprintId;

  useEffect(() => {
    if (!sprintId) {
      setLoading(false);
      setError("No sprint selected. Configure this widget with a sprint ID.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getSprintProgress(sprintId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err?.response?.data?.message || "Failed to load sprint data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sprintId]);

  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const progressColor =
    data.percentComplete >= 75
      ? "text-green-600"
      : data.percentComplete >= 40
        ? "text-amber-600"
        : "text-gray-600";

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700 truncate">
          {data.sprintName}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              data.scopeMode === "frozen"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {data.scopeMode === "frozen" ? "Frozen" : "Live"}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              STATUS_COLORS[data.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {data.status}
          </span>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-3xl font-bold ${progressColor}`}>
          {data.percentComplete}%
        </span>
        <span className="text-xs text-gray-500">
          {data.completedPoints}/{data.totalPoints} SP
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            data.percentComplete >= 75
              ? "bg-green-500"
              : data.percentComplete >= 40
                ? "bg-amber-500"
                : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(100, data.percentComplete)}%` }}
        />
      </div>

      {/* Mini burndown sparkline */}
      {data.burndownSample.length > 0 && (
        <div className="flex-1 min-h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.burndownSample}
              margin={{ top: 2, right: 4, left: 0, bottom: 2 }}
            >
              <YAxis domain={[0, data.totalPoints]} hide />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 6,
                  borderColor: "#e5e7eb",
                  padding: "4px 8px",
                }}
                formatter={(value: number) => [`${value} SP`, "Remaining"]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date || ""
                }
              />
              <Line
                type="monotone"
                dataKey="remainingPoints"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="idealRemaining"
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{new Date(data.startDate).toLocaleDateString()}</span>
        <span>{data.remainingPoints} SP remaining</span>
        <span>{new Date(data.endDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
