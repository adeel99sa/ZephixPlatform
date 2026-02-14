/**
 * Phase 2F: What-If Scenario Page (MVP)
 *
 * - Create scenarios scoped to project or portfolio
 * - Add actions (shift project/task, change capacity, change budget)
 * - Run compute
 * - Show before vs after comparison with deltas
 *
 * Gating: Feature flag `scenarioPlanning`.
 * Role: VIEWER blocked. MEMBER read-only. ADMIN/Owner full access.
 */
import React, { useEffect, useState } from "react";
import { useAuth } from "@/state/AuthContext";
import {
  listScenarios,
  createScenario,
  getScenario,
  addAction,
  removeAction,
  computeScenario,
  deleteScenario,
  type ScenarioPlan,
  type ScenarioSummary,
  type ScenarioActionType,
} from "./scenarios.api";

function isOwnerOrAdmin(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "ADMIN" || r === "OWNER";
}

function deltaColor(val: number): string {
  if (val < 0) return "#22c55e"; // improvement
  if (val > 0) return "#dc2626"; // degradation
  return "#6b7280";
}

function formatDelta(val: number | null, suffix = ""): string {
  if (val == null) return "N/A";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val}${suffix}`;
}

const ACTION_TYPES: { value: ScenarioActionType; label: string }[] = [
  { value: "shift_project", label: "Shift Project" },
  { value: "shift_task", label: "Shift Task" },
  { value: "change_capacity", label: "Change Capacity" },
  { value: "change_budget", label: "Change Budget" },
];

export default function ScenarioPage() {
  const { user } = useAuth();
  const role = (user?.platformRole || user?.role || "VIEWER").toUpperCase();
  const canWrite = isOwnerOrAdmin(role);

  const [scenarios, setScenarios] = useState<ScenarioPlan[]>([]);
  const [selected, setSelected] = useState<ScenarioPlan | null>(null);
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopeType, setNewScopeType] = useState<"project" | "portfolio">("project");
  const [newScopeId, setNewScopeId] = useState("");

  // Action form
  const [actionType, setActionType] = useState<ScenarioActionType>("shift_project");
  const [actionPayload, setActionPayload] = useState("");

  useEffect(() => {
    loadScenarios();
  }, []);

  async function loadScenarios() {
    try {
      const list = await listScenarios();
      setScenarios(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load scenarios");
    }
  }

  async function handleCreate() {
    if (!newName || !newScopeId) return;
    setLoading(true);
    try {
      const plan = await createScenario({
        name: newName,
        scopeType: newScopeType,
        scopeId: newScopeId,
      });
      setScenarios((prev) => [plan, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewScopeId("");
    } catch (err: any) {
      setError(err?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id: string) {
    setLoading(true);
    try {
      const plan = await getScenario(id);
      setSelected(plan);
      if (plan.result) {
        setSummary(plan.result.summary);
        setWarnings(plan.result.warnings || []);
      } else {
        setSummary(null);
        setWarnings([]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load scenario");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAction() {
    if (!selected) return;
    try {
      const payload = JSON.parse(actionPayload || "{}");
      await addAction(selected.id, actionType, payload);
      await handleSelect(selected.id);
      setActionPayload("");
    } catch (err: any) {
      setError(err?.message || "Invalid payload JSON");
    }
  }

  async function handleRemoveAction(actionId: string) {
    if (!selected) return;
    await removeAction(selected.id, actionId);
    await handleSelect(selected.id);
  }

  async function handleCompute() {
    if (!selected) return;
    setLoading(true);
    try {
      const result = await computeScenario(selected.id);
      setSummary(result.summary);
      setWarnings(result.warnings);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Compute failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteScenario(id);
    if (selected?.id === id) {
      setSelected(null);
      setSummary(null);
    }
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        What-If Scenarios
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Simulate schedule, capacity, and budget changes without affecting live data.
        {!canWrite && " (Read-only)"}
      </p>

      {error && <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>}

      {/* Scenario list */}
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Scenarios</h2>
            {canWrite && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                style={{ padding: "4px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
              >
                + New
              </button>
            )}
          </div>

          {showCreate && canWrite && (
            <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <input placeholder="Scenario name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: "100%", padding: 6, marginBottom: 8, border: "1px solid #d1d5db", borderRadius: 4 }} />
              <select value={newScopeType} onChange={(e) => setNewScopeType(e.target.value as any)} style={{ width: "100%", padding: 6, marginBottom: 8, border: "1px solid #d1d5db", borderRadius: 4 }}>
                <option value="project">Project</option>
                <option value="portfolio">Portfolio</option>
              </select>
              <input placeholder="Scope ID (project/portfolio UUID)" value={newScopeId} onChange={(e) => setNewScopeId(e.target.value)} style={{ width: "100%", padding: 6, marginBottom: 8, border: "1px solid #d1d5db", borderRadius: 4 }} />
              <button onClick={handleCreate} disabled={loading} style={{ width: "100%", padding: 6, background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Create
              </button>
            </div>
          )}

          {scenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelect(s.id)}
              style={{
                padding: 10,
                marginBottom: 8,
                border: `1px solid ${selected?.id === s.id ? "#3b82f6" : "#e5e7eb"}`,
                borderRadius: 8,
                cursor: "pointer",
                background: selected?.id === s.id ? "#eff6ff" : "#fff",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {s.scopeType} · {s.status}
              </div>
              {canWrite && (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Detail pane */}
        <div style={{ flex: 1 }}>
          {!selected && <p style={{ color: "#6b7280" }}>Select a scenario to view details.</p>}

          {selected && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{selected.name}</h2>

              {/* Actions */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Actions ({selected.actions?.length || 0})</h3>
                {(selected.actions || []).map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: 8, border: "1px solid #f3f4f6", borderRadius: 4, marginBottom: 4, fontSize: 13 }}>
                    <span><strong>{a.actionType}</strong>: {JSON.stringify(a.payload)}</span>
                    {canWrite && (
                      <button onClick={() => handleRemoveAction(a.id)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                {canWrite && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <select value={actionType} onChange={(e) => setActionType(e.target.value as any)} style={{ padding: 6, border: "1px solid #d1d5db", borderRadius: 4 }}>
                      {ACTION_TYPES.map((at) => (
                        <option key={at.value} value={at.value}>{at.label}</option>
                      ))}
                    </select>
                    <input placeholder='{"projectId":"...","shiftDays":7}' value={actionPayload} onChange={(e) => setActionPayload(e.target.value)} style={{ flex: 1, padding: 6, border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
                    <button onClick={handleAddAction} style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Compute button */}
              {canWrite && (
                <button
                  onClick={handleCompute}
                  disabled={loading}
                  style={{ padding: "8px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, marginBottom: 24 }}
                >
                  {loading ? "Computing..." : "Run Compute"}
                </button>
              )}

              {warnings.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: "#fef3c7", borderRadius: 6 }}>
                  {warnings.map((w, i) => (
                    <p key={i} style={{ fontSize: 13, color: "#92400e" }}>{w}</p>
                  ))}
                </div>
              )}

              {/* Results: Before vs After */}
              {summary && (
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Results: Before vs After</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                    <DeltaCard label="Overalloc. Days" before={summary.before.overallocatedDays} after={summary.after.overallocatedDays} delta={summary.deltas.overallocatedDaysDelta} />
                    <DeltaCard label="Overalloc. Users" before={summary.before.overallocatedUsers} after={summary.after.overallocatedUsers} delta={summary.deltas.overallocatedUsersDelta} />
                    <DeltaCard label="CPI" before={summary.before.aggregateCPI} after={summary.after.aggregateCPI} delta={summary.deltas.cpiDelta} invert />
                    <DeltaCard label="SPI" before={summary.before.aggregateSPI} after={summary.after.aggregateSPI} delta={summary.deltas.spiDelta} invert />
                    <DeltaCard label="CP Slip (min)" before={summary.before.criticalPathSlipMinutes} after={summary.after.criticalPathSlipMinutes} delta={summary.deltas.criticalPathSlipDelta} />
                    <DeltaCard label="Baseline Drift (min)" before={summary.before.baselineDriftMinutes} after={summary.after.baselineDriftMinutes} delta={summary.deltas.baselineDriftDelta} />
                  </div>

                  {/* Capacity summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                      <h4 style={{ fontWeight: 600, marginBottom: 8 }}>Before</h4>
                      <p>Capacity: {summary.before.totalCapacityHours}h</p>
                      <p>Demand: {summary.before.totalDemandHours}h</p>
                    </div>
                    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                      <h4 style={{ fontWeight: 600, marginBottom: 8 }}>After</h4>
                      <p>Capacity: {summary.after.totalCapacityHours}h</p>
                      <p>Demand: {summary.after.totalDemandHours}h</p>
                    </div>
                  </div>

                  {/* Impacted projects */}
                  {summary.impactedProjects.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Top Impacted Projects</h3>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                            <th style={{ padding: 8 }}>Project</th>
                            <th style={{ padding: 8 }}>Impact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.impactedProjects.map((p) => (
                            <tr key={p.projectId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: 8 }}>{p.projectName}</td>
                              <td style={{ padding: 8, color: "#6b7280" }}>{p.impactSummary}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  before,
  after,
  delta,
  invert,
}: {
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  invert?: boolean;
}) {
  // For CPI/SPI, positive delta is good (invert color logic)
  const color = delta == null ? "#6b7280" : invert ? deltaColor(-delta) : deltaColor(delta);

  return (
    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>{before ?? "N/A"}</span>
          <span style={{ margin: "0 6px", color: "#d1d5db" }}>&rarr;</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{after ?? "N/A"}</span>
        </div>
        <span style={{ fontWeight: 700, color, fontSize: 16 }}>{formatDelta(delta)}</span>
      </div>
    </div>
  );
}
