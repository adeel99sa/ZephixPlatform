import React from "react";
import { useParams } from "react-router-dom";
import {
  createRisk,
  listRisks,
  updateRisk,
} from "@/features/risks/risks.api";
import type {
  CreateRiskInput,
  Risk,
  RiskSeverity,
  RiskStatus,
  UpdateRiskInput,
} from "@/features/risks/types";

const SEVERITIES: RiskSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: RiskStatus[] = ["OPEN", "MITIGATED", "ACCEPTED", "CLOSED"];

export default function ProjectRisksTab() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = React.useState<Risk[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = React.useState<"" | RiskSeverity>("");
  const [statusFilter, setStatusFilter] = React.useState<"" | RiskStatus>("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newSeverity, setNewSeverity] = React.useState<RiskSeverity>("MEDIUM");
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editSeverity, setEditSeverity] = React.useState<RiskSeverity>("MEDIUM");
  const [editStatus, setEditStatus] = React.useState<RiskStatus>("OPEN");
  const [savingEdit, setSavingEdit] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listRisks({
        projectId,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems(result.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load risks");
    } finally {
      setLoading(false);
    }
  }, [projectId, severityFilter, statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onCreateRisk() {
    if (!projectId || !newTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateRiskInput = {
        projectId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        severity: newSeverity,
      };
      const created = await createRisk(payload);
      setItems((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setNewSeverity("MEDIUM");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create risk");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(risk: Risk) {
    setEditingId(risk.id);
    setEditTitle(risk.title);
    setEditDescription(risk.description || "");
    setEditSeverity(risk.severity);
    setEditStatus(risk.status);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditSeverity("MEDIUM");
    setEditStatus("OPEN");
  }

  async function saveEdit(riskId: string) {
    setSavingEdit(true);
    setError(null);
    try {
      const patch: UpdateRiskInput = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        severity: editSeverity,
        status: editStatus,
      };
      const updated = await updateRisk(riskId, patch);
      setItems((prev) => prev.map((item) => (item.id === riskId ? updated : item)));
      cancelEdit();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update risk");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900">Risks</h2>

      <div className="grid gap-2 md:grid-cols-4">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Risk title"
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
          className="rounded border px-3 py-2 text-sm"
        />
        <select
          value={newSeverity}
          onChange={(e) => setNewSeverity(e.target.value as RiskSeverity)}
          className="rounded border px-3 py-2 text-sm"
        >
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
        <button
          onClick={onCreateRisk}
          disabled={submitting || !newTitle.trim()}
          className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Risk"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-600">Severity</label>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as "" | RiskSeverity)}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="">All</option>
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>

        <label className="ml-2 text-xs text-slate-600">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | RiskStatus)}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button onClick={() => void load()} className="rounded border px-2 py-1 text-xs">
          Apply
        </button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-slate-500">Loading risks...</div>}

      {!loading && items.length === 0 && (
        <div className="rounded border border-dashed p-6 text-sm text-slate-500">No risks found.</div>
      )}

      <div className="space-y-2">
        {items.map((risk) => (
          <div key={risk.id} className="rounded border p-3">
            {editingId === risk.id ? (
              <div className="grid gap-2 md:grid-cols-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                />
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                />
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as RiskSeverity)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as RiskStatus)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-4 flex gap-2">
                  <button
                    onClick={() => void saveEdit(risk.id)}
                    disabled={savingEdit || !editTitle.trim()}
                    className="rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                  >
                    {savingEdit ? "Saving..." : "Save"}
                  </button>
                  <button onClick={cancelEdit} className="rounded border px-3 py-1 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-900">{risk.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{risk.description || "-"}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Severity: {risk.severity} | Status: {risk.status}
                  </div>
                </div>
                <button onClick={() => startEdit(risk)} className="rounded border px-2 py-1 text-xs">
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

