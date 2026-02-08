/**
 * Sprint Burndown / Burnup chart.
 *
 * Uses recharts (already installed).
 * Toggle between burndown (remaining) and burnup (completed) view.
 */
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { DailyBucket } from "../sprints.api";

type ChartMode = "burndown" | "burnup";

interface BurndownChartProps {
  buckets: DailyBucket[];
  totalPoints: number;
  sprintName: string;
  scopeMode?: "live" | "frozen";
}

export function BurndownChart({
  buckets,
  totalPoints,
  sprintName,
  scopeMode = "live",
}: BurndownChartProps) {
  const [mode, setMode] = useState<ChartMode>("burndown");

  if (!buckets || buckets.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 border rounded-md bg-gray-50">
        No burndown data available. Assign tasks with story points to this
        sprint.
      </div>
    );
  }

  // Format date labels as "Mar 2" style
  const chartData = buckets.map((b) => ({
    ...b,
    label: formatDateLabel(b.date),
  }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBucket = chartData.find((b) => b.date === todayStr);

  return (
    <div className="space-y-3">
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-700">
            {mode === "burndown" ? "Burndown" : "Burnup"} — {sprintName}
          </h4>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              scopeMode === "frozen"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {scopeMode === "frozen" ? "Scope frozen" : "Scope is live"}
          </span>
        </div>
        <div className="flex gap-1 rounded-md border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setMode("burndown")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === "burndown"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Burndown
          </button>
          <button
            onClick={() => setMode("burnup")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === "burnup"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Burnup
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, totalPoints]}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                borderColor: "#e5e7eb",
              }}
              formatter={(value: number, name: string) => [
                value,
                formatLegendName(name),
              ]}
              labelFormatter={(label: string) => `Day: ${label}`}
            />
            <Legend
              verticalAlign="bottom"
              height={24}
              formatter={formatLegendName}
              wrapperStyle={{ fontSize: 11 }}
            />

            {/* Today marker */}
            {todayBucket && (
              <ReferenceLine
                x={todayBucket.label}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "Today",
                  fill: "#f59e0b",
                  fontSize: 10,
                  position: "top",
                }}
              />
            )}

            {mode === "burndown" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="remainingPoints"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="idealRemaining"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="completedPoints"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalPoints"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="scope"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6 text-xs text-gray-500 border-t pt-2">
        <span>
          Total: <strong className="text-gray-700">{totalPoints} pts</strong>
        </span>
        {buckets.length > 0 && (
          <>
            <span>
              Completed:{" "}
              <strong className="text-green-600">
                {buckets[buckets.length - 1].completedPoints} pts
              </strong>
            </span>
            <span>
              Remaining:{" "}
              <strong className="text-blue-600">
                {buckets[buckets.length - 1].remainingPoints} pts
              </strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatLegendName(name: string): string {
  const map: Record<string, string> = {
    remainingPoints: "Remaining",
    idealRemaining: "Ideal",
    completedPoints: "Completed",
    scope: "Scope",
    totalPoints: "Scope",
  };
  return map[name] ?? name;
}
