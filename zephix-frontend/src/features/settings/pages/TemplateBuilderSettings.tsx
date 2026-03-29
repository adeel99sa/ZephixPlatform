import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { TemplateBuilderPreviewPanel } from "../components/TemplateBuilderPreviewPanel";
import { SettingsPageHeader, SettingsRow } from "../components/ui";
import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";
import {
  APPROVER_ROLE_LABELS,
  ARTIFACT_LABELS,
  type ApproverRole,
  type ArtifactPackKey,
  type CoreTemplateDefinition,
  type FieldBinding,
  type GateDefinition,
  type TabKey,
  TAB_LABELS,
  type TemplateUpdateBehavior,
  WORKFLOW_OPTIONS,
  getTemplateById,
  TEMPLATE_CATEGORY_DISPLAY_LABELS,
} from "../templates/templateLibrarySeed";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input/Input";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";

const ALL_TABS: TabKey[] = [
  "overview",
  "tasks",
  "docs",
  "risks",
  "resources",
  "dashboard",
];

const TAB_PRESENCE_OPTIONS: FieldBinding["presence"][] = [
  "required",
  "optional",
  "locked",
];

const GLOBAL_FIELD_CATALOG: { id: string; label: string }[] = [
  { id: "sponsor_signoff", label: "Sponsor Sign-off" },
  { id: "budget_code", label: "Budget Code" },
  { id: "residual_risk", label: "Residual risk score" },
  { id: "priority", label: "Priority" },
  { id: "assignee", label: "Assignee" },
  { id: "story_points", label: "Story Points" },
  { id: "epic", label: "Epic" },
  { id: "ac", label: "Acceptance Criteria" },
];

const ARTIFACT_KEYS = Object.keys(ARTIFACT_LABELS) as ArtifactPackKey[];

const DELTA_OPTIONS: { value: TemplateUpdateBehavior; label: string }[] = [
  { value: "manual_review", label: "Manual Review" },
  {
    value: "auto_apply_non_destructive",
    label: "Auto-Apply Non-Destructive",
  },
  { value: "strict_sync", label: "Strict Sync" },
];

function cloneDef(d: CoreTemplateDefinition): CoreTemplateDefinition {
  return JSON.parse(JSON.stringify(d)) as CoreTemplateDefinition;
}

function createEmptyTemplate(): CoreTemplateDefinition {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `draft-${Date.now()}`,
    name: "Untitled Template",
    category: "Delivery",
    methodology: "Simple",
    governanceLevel: "Execution",
    publishState: "draft",
    version: "0.1",
    lastUpdated: today,
    lastEditor: "You",
    lastPublishedAt: null,
    description: "",
    defaultTabs: ["overview", "tasks"],
    tabRules: {
      overview: "required",
      tasks: "required",
      docs: "optional",
    },
    statuses: ["TODO", "IN_PROGRESS", "DONE"],
    defaultFields: [],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  };
}

function defsEqual(a: CoreTemplateDefinition, b: CoreTemplateDefinition): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function TemplateBuilderSettings(): ReactElement {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateFrom = (
    location.state as { duplicateFrom?: string } | undefined
  )?.duplicateFrom;

  const [state, setState] = useState<CoreTemplateDefinition>(() =>
    createEmptyTemplate(),
  );
  const [saved, setSaved] = useState<CoreTemplateDefinition>(() =>
    createEmptyTemplate(),
  );
  const [deltaBehavior, setDeltaBehavior] =
    useState<TemplateUpdateBehavior>("manual_review");
  const [statusText, setStatusText] = useState("");
  const [phasesText, setPhasesText] = useState("");

  const isNew = !templateId;

  useEffect(() => {
    if (duplicateFrom) {
      const seed = getTemplateById(duplicateFrom);
      if (seed) {
        const copy = cloneDef(seed);
        copy.id = `copy-${Date.now()}`;
        copy.name = `${seed.name} (Copy)`;
        copy.publishState = "draft";
        copy.version = "0.1";
        copy.lastPublishedAt = null;
        setState(copy);
        setSaved(cloneDef(copy));
        setStatusText(copy.statuses.join("\n"));
        setPhasesText(copy.phases.join("\n"));
        return;
      }
    }
    if (templateId) {
      const seed = getTemplateById(templateId);
      if (seed) {
        const c = cloneDef(seed);
        setState(c);
        setSaved(cloneDef(c));
        setStatusText(c.statuses.join("\n"));
        setPhasesText(c.phases.join("\n"));
        return;
      }
    }
    const empty = createEmptyTemplate();
    setState(empty);
    setSaved(cloneDef(empty));
    setStatusText(empty.statuses.join("\n"));
    setPhasesText(empty.phases.join("\n"));
  }, [templateId, duplicateFrom]);

  const dirty = useMemo(() => !defsEqual(state, saved), [state, saved]);

  const parseLines = (raw: string): string[] =>
    raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSaveDraft = useCallback(() => {
    const statuses = parseLines(statusText);
    const phases = parseLines(phasesText);
    setState((s) => {
      const next: CoreTemplateDefinition = {
        ...s,
        statuses: statuses.length ? statuses : s.statuses,
        phases,
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
      setSaved(cloneDef(next));
      return next;
    });
  }, [statusText, phasesText]);

  const handlePublish = useCallback(() => {
    const statuses = parseLines(statusText);
    const phases = parseLines(phasesText);
    setState((s) => {
      const next: CoreTemplateDefinition = {
        ...s,
        statuses: statuses.length ? statuses : s.statuses,
        phases,
        publishState: "published",
        version: bumpVersion(s.version),
        lastPublishedAt: new Date().toISOString().slice(0, 10),
        lastEditor: "You",
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
      setSaved(cloneDef(next));
      return next;
    });
  }, [statusText, phasesText]);

  const title = isNew ? "New Template" : state.name;

  return (
    <div data-settings-template-builder className="min-w-0">
      <SettingsPageHeader
        title={title}
        description="Define structure, governance, tabs, fields, and artifacts for this template."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isNew ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    publishState: "deprecated",
                  }));
                }}
              >
                Preview deprecate
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!templateId || !getTemplateById(templateId)}
              title={
                templateId && getTemplateById(templateId)
                  ? "Create a draft copy from this library baseline"
                  : "Open a saved library template to duplicate"
              }
              onClick={() => {
                if (templateId && getTemplateById(templateId)) {
                  navigate("/settings/template-builder/new", {
                    state: { duplicateFrom: templateId },
                  });
                }
              }}
            >
              Preview duplicate
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!dirty}
              onClick={handleSaveDraft}
            >
              Save draft locally
            </Button>
            <Button type="button" size="sm" onClick={handlePublish}>
              Preview publish state
            </Button>
          </div>
        }
      />

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
        <div className="min-w-0 space-y-8">
          <GovernanceSection title="A. Basics">
            <SettingsRow
              label="Template name"
              description="Displayed in the template library and project creation."
              control={
                <Input
                  className="max-w-md"
                  value={state.name}
                  onChange={(e) =>
                    setState((s) => ({ ...s, name: e.target.value }))
                  }
                  aria-label="Template name"
                />
              }
            />
            <SettingsRow
              label="Category"
              description="Delivery, Product, or Portfolio & Governance family."
              control={
                <select
                  className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
                  value={state.category}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      category: e.target.value as CoreTemplateDefinition["category"],
                    }))
                  }
                  aria-label="Category"
                >
                  <option value="Delivery">Delivery</option>
                  <option value="Product">Product</option>
                  <option value="PMO">{TEMPLATE_CATEGORY_DISPLAY_LABELS.PMO}</option>
                </select>
              }
            />
            <SettingsRow
              label="Methodology"
              description="Label for filtering and reporting."
              control={
                <Input
                  className="max-w-md"
                  value={state.methodology}
                  onChange={(e) =>
                    setState((s) => ({ ...s, methodology: e.target.value }))
                  }
                  aria-label="Methodology"
                />
              }
            />
            <SettingsRow
              label="Governance level"
              description="Aligns with Policy Engine defaults for new projects."
              control={
                <select
                  className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
                  value={state.governanceLevel}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      governanceLevel: e.target.value as CoreTemplateDefinition["governanceLevel"],
                    }))
                  }
                  aria-label="Governance level"
                >
                  <option value="Execution">Execution</option>
                  <option value="Structured">Structured</option>
                  <option value="Governed">Governed</option>
                </select>
              }
            />
            <SettingsRow
              label="Description"
              description="Helps admins choose the right baseline."
              control={
                <textarea
                  className="min-h-[88px] w-full max-w-xl rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={state.description}
                  onChange={(e) =>
                    setState((s) => ({ ...s, description: e.target.value }))
                  }
                  aria-label="Description"
                />
              }
            />
          </GovernanceSection>

          <GovernanceSection title="B. Default tabs">
            <p className="mb-4 text-sm text-slate-600">
              Toggle which shells appear on new projects. Required / Optional /
              Locked are structural defaults only.
            </p>
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              {ALL_TABS.map((tab) => {
                const on = state.defaultTabs.includes(tab);
                return (
                  <div
                    key={tab}
                    className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        id={`tab-${tab}`}
                        checked={on}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setState((s) => ({
                            ...s,
                            defaultTabs: checked
                              ? [...new Set([...s.defaultTabs, tab])]
                              : s.defaultTabs.filter((t) => t !== tab),
                            tabRules: {
                              ...s.tabRules,
                              [tab]: s.tabRules[tab] ?? "optional",
                            },
                          }));
                        }}
                      />
                      <label
                        htmlFor={`tab-${tab}`}
                        className="text-sm font-medium text-slate-900"
                      >
                        {TAB_LABELS[tab]}
                      </label>
                    </div>
                    <select
                      className={cn(
                        SETTINGS_TABLE_SELECT_CLASS,
                        "h-9 max-w-[11rem]",
                      )}
                      disabled={!on}
                      value={state.tabRules[tab] ?? "optional"}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          tabRules: {
                            ...s.tabRules,
                            [tab]: e.target.value as FieldBinding["presence"],
                          },
                        }))
                      }
                      aria-label={`${TAB_LABELS[tab]} presence`}
                    >
                      {TAB_PRESENCE_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </GovernanceSection>

          <GovernanceSection title="C. Statuses and workflow">
            <SettingsRow
              label="Base workflow"
              description="Links to workspace status definitions (B-6). Editing order is a local list, not a runtime engine."
              control={
                <select
                  className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-md")}
                  value={state.baseWorkflowId}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      baseWorkflowId: e.target
                        .value as CoreTemplateDefinition["baseWorkflowId"],
                    }))
                  }
                  aria-label="Base workflow"
                >
                  {WORKFLOW_OPTIONS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              }
            />
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <label
                htmlFor="status-list"
                className="text-sm font-medium text-slate-900"
              >
                Status order (one per line)
              </label>
              <textarea
                id="status-list"
                className="mt-2 min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs shadow-sm"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                onBlur={() => {
                  const lines = parseLines(statusText);
                  setState((s) => ({
                    ...s,
                    statuses: lines.length ? lines : s.statuses,
                  }));
                }}
              />
            </div>
          </GovernanceSection>

          <GovernanceSection title="D. Fields (global catalog)">
            <p className="mb-3 text-sm text-slate-600">
              Choose fields from the workspace custom-field catalog (B-6). Mark
              presence per template.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GLOBAL_FIELD_CATALOG.map((gf) => {
                const existing = state.defaultFields.find((f) => f.id === gf.id);
                const on = !!existing;
                return (
                  <div
                    key={gf.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2"
                  >
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-600"
                        checked={on}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setState((s) => {
                            if (checked) {
                              return {
                                ...s,
                                defaultFields: [
                                  ...s.defaultFields.filter((x) => x.id !== gf.id),
                                  {
                                    id: gf.id,
                                    label: gf.label,
                                    presence: "optional",
                                  },
                                ],
                              };
                            }
                            return {
                              ...s,
                              defaultFields: s.defaultFields.filter(
                                (x) => x.id !== gf.id,
                              ),
                            };
                          });
                        }}
                      />
                      {gf.label}
                    </label>
                    {on ? (
                      <select
                        className={cn(
                          SETTINGS_TABLE_SELECT_CLASS,
                          "h-8 max-w-[8rem] text-xs",
                        )}
                        value={existing?.presence ?? "optional"}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            defaultFields: s.defaultFields.map((f) =>
                              f.id === gf.id
                                ? {
                                    ...f,
                                    presence: e.target
                                      .value as FieldBinding["presence"],
                                  }
                                : f,
                            ),
                          }))
                        }
                        aria-label={`${gf.label} presence`}
                      >
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                        <option value="locked">Read-only</option>
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </GovernanceSection>

          <GovernanceSection title="E. Phases and gates">
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/30 p-4 ring-1 ring-amber-100">
              <p className="text-sm text-slate-700">
                Phase gates define governance checkpoints. Approver roles are
                role-based, not named users.
              </p>
              <div className="mt-4 space-y-3">
                <SettingsRow
                  label="Recycle limit"
                  description="RECYCLE outcomes before governance review (Policy Engine alignment)."
                  control={
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      className="w-20 text-right tabular-nums"
                      value={state.recycleLimit}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          recycleLimit: Math.min(
                            10,
                            Math.max(1, Number(e.target.value) || 1),
                          ),
                        }))
                      }
                      aria-label="Recycle limit"
                    />
                  }
                />
                <SettingsRow
                  label="Multi-level approvals"
                  description="Require multiple role sign-offs for GO decisions."
                  control={
                    <Switch
                      id="tmpl-multi-approval"
                      checked={state.multiLevelApprovals}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          multiLevelApprovals: e.target.checked,
                        }))
                      }
                    />
                  }
                />
              </div>
              <div className="mt-4">
                <label
                  htmlFor="phases-ta"
                  className="text-sm font-medium text-slate-900"
                >
                  Phases (one per line)
                </label>
                <textarea
                  id="phases-ta"
                  className="mt-2 min-h-[88px] w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  value={phasesText}
                  onChange={(e) => setPhasesText(e.target.value)}
                  onBlur={() => {
                    setState((s) => ({
                      ...s,
                      phases: parseLines(phasesText),
                    }));
                  }}
                />
              </div>
              <GateListEditor
                gates={state.gates}
                onChange={(gates) => setState((s) => ({ ...s, gates }))}
              />
            </div>
          </GovernanceSection>

          <GovernanceSection title="F. Required artifacts">
            <div className="grid gap-2 sm:grid-cols-2">
              {ARTIFACT_KEYS.map((key) => {
                const rule = state.artifacts.find((a) => a.key === key);
                const presence = rule?.presence ?? "hidden";
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {ARTIFACT_LABELS[key]}
                    </span>
                    <select
                      className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-9 text-xs")}
                      value={presence}
                      onChange={(e) => {
                        const val = e.target.value as
                          | "required_before_gate"
                          | "optional"
                          | "hidden";
                        setState((s) => {
                          const rest = s.artifacts.filter((a) => a.key !== key);
                          if (val === "hidden") {
                            return { ...s, artifacts: rest };
                          }
                          return {
                            ...s,
                            artifacts: [...rest, { key, presence: val }],
                          };
                        });
                      }}
                      aria-label={`${ARTIFACT_LABELS[key]} rule`}
                    >
                      <option value="hidden">Hidden</option>
                      <option value="optional">Optional</option>
                      <option value="required_before_gate">
                        Required before gate
                      </option>
                    </select>
                  </div>
                );
              })}
            </div>
          </GovernanceSection>

          <GovernanceSection title="G. Delta / inheritance">
            <SettingsRow
              label="Template update propagation"
              description="Matches Template Enforcement language — how published changes reach projects."
              control={
                <select
                  className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-md")}
                  value={deltaBehavior}
                  onChange={(e) =>
                    setDeltaBehavior(
                      e.target.value as TemplateUpdateBehavior,
                    )
                  }
                  aria-label="Delta behavior"
                >
                  {DELTA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              }
            />
          </GovernanceSection>

          <section
            data-settings-template-versioning
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Template versions
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Draft and publish history — UI only for MVP (no diff engine).
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current version
                </dt>
                <dd className="font-mono text-slate-900">v{state.version}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Publish state (local preview)
                </dt>
                <dd className="text-slate-900">
                  {state.publishState} (local preview)
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last preview publish date
                </dt>
                <dd className="text-slate-800">
                  {state.lastPublishedAt ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last editor
                </dt>
                <dd className="text-slate-800">{state.lastEditor}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" disabled>
                View previous version
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled>
                Compare versions
              </Button>
            </div>
          </section>

          <div className="flex flex-wrap gap-3 pb-8">
            <Link
              to="/settings/template-library"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← Back to Template Library
            </Link>
          </div>
        </div>

        <div className="mt-8 xl:mt-0">
          <TemplateBuilderPreviewPanel
            template={state}
            className="xl:sticky xl:top-6"
          />
        </div>
      </div>
    </div>
  );
}

function bumpVersion(v: string): string {
  const n = parseFloat(v);
  if (Number.isNaN(n)) {
    return "1.0";
  }
  return (Math.round((n + 0.1) * 10) / 10).toFixed(1);
}

function GovernanceSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function GateListEditor({
  gates,
  onChange,
}: {
  gates: GateDefinition[];
  onChange: (g: GateDefinition[]) => void;
}): ReactElement {
  const update = (i: number, patch: Partial<GateDefinition>): void => {
    onChange(
      gates.map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    );
  };

  const toggleRole = (i: number, role: ApproverRole): void => {
    const g = gates[i];
    if (!g) return;
    const has = g.approverRoles.includes(role);
    const nextRoles = has
      ? g.approverRoles.filter((r) => r !== role)
      : [...g.approverRoles, role];
    update(i, { approverRoles: nextRoles });
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-900">Gates</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange([
              ...gates,
              {
                id: `g-${Date.now()}`,
                name: "New gate",
                enabled: true,
                required: true,
                approverRoles: ["project_manager"],
              },
            ])
          }
        >
          Add gate
        </Button>
      </div>
      {gates.length === 0 ? (
        <p className="text-sm text-slate-500">No gates — optional for agile templates.</p>
      ) : (
        gates.map((g, i) => (
          <div
            key={g.id}
            className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-[12rem] flex-1"
                value={g.name}
                onChange={(e) => update(i, { name: e.target.value })}
                aria-label={`Gate ${i + 1} name`}
              />
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={g.enabled}
                  onChange={(e) => update(i, { enabled: e.target.checked })}
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={g.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
                Required
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(APPROVER_ROLE_LABELS) as ApproverRole[]).map((role) => (
                <label
                  key={role}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-800"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-indigo-600"
                    checked={g.approverRoles.includes(role)}
                    onChange={() => toggleRole(i, role)}
                  />
                  {APPROVER_ROLE_LABELS[role]}
                </label>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange(gates.filter((_, idx) => idx !== i))}
            >
              Remove gate
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
