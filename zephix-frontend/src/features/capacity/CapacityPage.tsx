/**
 * Phase 2E: Capacity Page (MVP)
 *
 * - Date range picker (default current week)
 * - Summary cards: capacity, demand, utilization
 * - User table with expand for daily breakdown
 * - Overallocation section
 * - Recommendations section (owner/admin only)
 * - Read-only for member and viewer
 *
 * Gating: Feature flag `capacityEngine`.
 * Role: VIEWER can see utilization. MEMBER can see utilization + overallocations.
 *        Owner/Admin see everything including recommendations and edit controls.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/state/AuthContext";
import {
  getUtilization,
  getOverallocations,
  getRecommendations,
  type UtilizationResult,
  type OverallocationResult,
  type LevelingResult,
  type UserDailyUtilization,
} from "./capacity.api";

/** Check if user has admin or owner privileges */
function isOwnerOrAdmin(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "ADMIN" || r === "OWNER";
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { from: formatDate(monday), to: formatDate(friday) };
}

/** Color for utilization value */
function utilizationColor(util: number): string {
  if (util >= 1.2) return "#dc2626"; // red
  if (util >= 1.0) return "#f59e0b"; // amber
  if (util >= 0.7) return "#22c55e"; // green
  return "#6b7280"; // gray
}

export default function CapacityPage() {
  const { user } = useAuth();
  const role = (user?.platformRole || user?.role || "VIEWER").toUpperCase();
  const canEdit = isOwnerOrAdmin(role);
  const canSeeRecommendations = isOwnerOrAdmin(role);

  const defaultRange = useMemo(() => getWeekRange(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const [utilization, setUtilization] = useState<UtilizationResult | null>(null);
  const [overallocations, setOverallocations] = useState<OverallocationResult | null>(null);
  const [recommendations, setRecommendations] = useState<LevelingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [util, over] = await Promise.all([
        getUtilization(from, to),
        getOverallocations(from, to),
      ]);
      setUtilization(util);
      setOverallocations(over);

      if (canSeeRecommendations) {
        const rec = await getRecommendations(from, to);
        setRecommendations(rec);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load capacity data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [from, to]);

  // Build per-user weekly rollup for the table
  const weeklyByUser = useMemo(() => {
    if (!utilization) return [];
    const map = new Map<string, typeof utilization.perUserWeekly[0]>();
    for (const w of utilization.perUserWeekly) {
      const existing = map.get(w.userId);
      if (!existing || w.totalDemandHours > existing.totalDemandHours) {
        map.set(w.userId, w);
      }
    }
    return [...map.values()];
  }, [utilization]);

  // Per-user daily breakdown
  const dailyByUser = useMemo(() => {
    if (!utilization) return new Map<string, UserDailyUtilization[]>();
    const map = new Map<string, UserDailyUtilization[]>();
    for (const d of utilization.perUserDaily) {
      if (!map.has(d.userId)) map.set(d.userId, []);
      map.get(d.userId)!.push(d);
    }
    return map;
  }, [utilization]);

  function toggleUser(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Resource Capacity
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Time-phased capacity vs. demand across workspace members.
        {canEdit ? "" : " (Read-only)"}
      </p>

      {/* Date range */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <label>
          From:{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4 }}
          />
        </label>
        <label>
          To:{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4 }}
          />
        </label>
        <button
          onClick={loadData}
          style={{
            padding: "6px 16px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {/* Summary cards */}
      {utilization && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <SummaryCard label="Total Capacity" value={`${utilization.workspaceSummary.totalCapacityHours}h`} />
          <SummaryCard label="Total Demand" value={`${utilization.workspaceSummary.totalDemandHours}h`} />
          <SummaryCard
            label="Avg Utilization"
            value={`${((utilization.workspaceSummary.averageUtilization ?? 0) * 100).toFixed(1)}%`}
            color={utilizationColor(utilization.workspaceSummary.averageUtilization ?? 0)}
          />
          <SummaryCard
            label="Overallocated Users"
            value={String(utilization.workspaceSummary.overallocatedUserCount)}
            color={utilization.workspaceSummary.overallocatedUserCount > 0 ? "#dc2626" : "#22c55e"}
          />
        </div>
      )}

      {/* User table */}
      {weeklyByUser.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>User Utilization</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: 8 }}>User</th>
                <th style={{ padding: 8 }}>Capacity (h)</th>
                <th style={{ padding: 8 }}>Demand (h)</th>
                <th style={{ padding: 8 }}>Utilization</th>
                <th style={{ padding: 8 }}>Peak Day</th>
                <th style={{ padding: 8 }}>Over Days</th>
              </tr>
            </thead>
            <tbody>
              {weeklyByUser.map((w) => (
                <React.Fragment key={w.userId}>
                  <tr
                    style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                    onClick={() => toggleUser(w.userId)}
                  >
                    <td style={{ padding: 8 }}>{w.userId.slice(0, 8)}...</td>
                    <td style={{ padding: 8 }}>{w.totalCapacityHours}</td>
                    <td style={{ padding: 8 }}>{w.totalDemandHours}</td>
                    <td style={{ padding: 8, color: utilizationColor(w.averageUtilization) }}>
                      {(w.averageUtilization * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: 8, color: utilizationColor(w.peakDayUtilization) }}>
                      {(w.peakDayUtilization * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: 8, color: w.overallocatedDays > 0 ? "#dc2626" : undefined }}>
                      {w.overallocatedDays}
                    </td>
                  </tr>
                  {expandedUsers.has(w.userId) && (
                    <tr>
                      <td colSpan={6} style={{ padding: "0 8px 8px 24px" }}>
                        <table style={{ width: "100%", fontSize: 13 }}>
                          <thead>
                            <tr style={{ color: "#6b7280" }}>
                              <th style={{ textAlign: "left", padding: 4 }}>Date</th>
                              <th style={{ textAlign: "left", padding: 4 }}>Cap</th>
                              <th style={{ textAlign: "left", padding: 4 }}>Dem</th>
                              <th style={{ textAlign: "left", padding: 4 }}>Util</th>
                              <th style={{ textAlign: "left", padding: 4 }}>Over</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(dailyByUser.get(w.userId) ?? []).map((d) => (
                              <tr key={d.date}>
                                <td style={{ padding: 4 }}>{d.date}</td>
                                <td style={{ padding: 4 }}>{d.capacityHours}</td>
                                <td style={{ padding: 4 }}>{d.demandHours}</td>
                                <td style={{ padding: 4, color: utilizationColor(d.utilization) }}>
                                  {(d.utilization * 100).toFixed(1)}%
                                </td>
                                <td style={{ padding: 4, color: d.overByHours > 0 ? "#dc2626" : undefined }}>
                                  {d.overByHours > 0 ? `+${d.overByHours}h` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overallocations */}
      {overallocations && overallocations.entries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "#dc2626" }}>
            Overallocations ({overallocations.totalOverallocatedDays} days, {overallocations.affectedUserCount} users)
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #fecaca", textAlign: "left" }}>
                <th style={{ padding: 8 }}>User</th>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Capacity</th>
                <th style={{ padding: 8 }}>Demand</th>
                <th style={{ padding: 8 }}>Over By</th>
              </tr>
            </thead>
            <tbody>
              {overallocations.entries.slice(0, 20).map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #fee2e2" }}>
                  <td style={{ padding: 8 }}>{e.userId.slice(0, 8)}...</td>
                  <td style={{ padding: 8 }}>{e.date}</td>
                  <td style={{ padding: 8 }}>{e.capacityHours}h</td>
                  <td style={{ padding: 8 }}>{e.demandHours}h</td>
                  <td style={{ padding: 8, color: "#dc2626", fontWeight: 600 }}>+{e.overByHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations (owner/admin only) */}
      {canSeeRecommendations && recommendations && recommendations.recommendations.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Leveling Recommendations
          </h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
            Read-only suggestions. Resolved: {recommendations.resolvedOverloadDays} days.
            Remaining: {recommendations.remainingOverloadDays} days.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Task</th>
                <th style={{ padding: 8 }}>User</th>
                <th style={{ padding: 8 }}>Current Start</th>
                <th style={{ padding: 8 }}>Recommended</th>
                <th style={{ padding: 8 }}>Shift</th>
                <th style={{ padding: 8 }}>Critical?</th>
                <th style={{ padding: 8 }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.recommendations.map((r) => (
                <tr key={r.taskId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>{r.taskTitle}</td>
                  <td style={{ padding: 8 }}>{r.userId.slice(0, 8)}...</td>
                  <td style={{ padding: 8 }}>{r.currentStartDate}</td>
                  <td style={{ padding: 8 }}>{r.recommendedStartDate}</td>
                  <td style={{ padding: 8 }}>+{r.shiftDays}d</td>
                  <td style={{ padding: 8, color: r.isCriticalPath ? "#dc2626" : "#22c55e" }}>
                    {r.isCriticalPath ? "Yes" : "No"}
                  </td>
                  <td style={{ padding: 8, fontSize: 12, color: "#6b7280" }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "#111827" }}>{value}</div>
    </div>
  );
}
