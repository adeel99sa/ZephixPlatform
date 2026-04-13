import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  administrationApi,
  type AdminTemplate,
  type GovernancePolicyItem,
} from "@/features/administration/api/administration.api";
import {
  POLICY_UI_META,
  resolveMethodologyKey,
  type GovernancePolicyUiMeta,
} from "@/features/administration/constants/governance-policies";

/**
 * List payload from GET /admin/templates is the unified Template entity shape;
 * AdminTemplate in the API module is a minimal subset — we widen here for UI.
 */
export type TemplatePanelData = AdminTemplate & {
  methodology?: string | null;
  deliveryMethod?: string | null;
  description?: string | null;
  isActive?: boolean;
  phases?: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedDurationDays?: number;
  }>;
  columnConfig?: Record<string, boolean> | null;
};

type GovernancePolicyWithMeta = GovernancePolicyItem & {
  meta: GovernancePolicyUiMeta;
};

export interface TemplateDetailPanelProps {
  template: TemplatePanelData;
  onClose: () => void;
}

/** App shell header is `h-14`; drawer is fixed so it must start below it on Admin + main app. */
const CHROME_TOP_CLASS = "top-14";
const CHROME_HEIGHT_CLASS = "h-[calc(100dvh-3.5rem)]";

export function TemplateDetailPanel({
  template,
  onClose,
}: TemplateDetailPanelProps) {
  const methodologyLabel = resolveMethodologyKey(template);
  const deliveryMethodRaw = template.deliveryMethod?.toString().trim() ?? "";
  const deliveryMethodologyKey = deliveryMethodRaw
    ? resolveMethodologyKey({ deliveryMethod: deliveryMethodRaw })
    : "";
  const showDeliveryMethodBadge =
    Boolean(deliveryMethodRaw) &&
    (deliveryMethodologyKey !== methodologyLabel ||
      deliveryMethodRaw.toLowerCase() !== methodologyLabel.toLowerCase());

  const [activeTab, setActiveTab] = useState<
    "overview" | "governance" | "columns"
  >("overview");

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <>
      <div
        className={`fixed left-0 right-0 bottom-0 z-30 bg-slate-900/20 ${CHROME_TOP_CLASS}`}
        aria-hidden
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 z-40 w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white shadow-lg ${CHROME_TOP_CLASS} ${CHROME_HEIGHT_CLASS}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <h2
              id="template-detail-title"
              className="text-lg font-semibold text-slate-900"
            >
              {template.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {methodologyLabel && methodologyLabel !== "custom" ? (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {methodologyLabel}
                </span>
              ) : null}
              {showDeliveryMethodBadge ? (
                <span
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                  title="Delivery method / template pack slug (when different from methodology)"
                >
                  {deliveryMethodRaw}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          {(["overview", "governance", "columns"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === "overview" ? (
            <TemplateOverviewTab template={template} />
          ) : null}
          {activeTab === "governance" ? (
            <TemplateGovernanceTab template={template} />
          ) : null}
          {activeTab === "columns" ? (
            <TemplateColumnsTab template={template} />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function TemplateOverviewTab({ template }: { template: TemplatePanelData }) {
  const phases = template.phases ?? [];
  const active =
    template.isActive !== undefined
      ? template.isActive
      : template.status !== "ARCHIVED";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-slate-500">Description</div>
        <p className="mt-1 text-sm text-slate-700">
          {template.description?.trim()
            ? template.description
            : "No description"}
        </p>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Methodology</div>
        <p className="mt-1 text-sm capitalize text-slate-700">
          {resolveMethodologyKey(template)}
        </p>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Status</div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              active ? "bg-green-500" : "bg-slate-300"
            }`}
          />
          <span className="text-sm text-slate-700">
            {active ? "Active" : "Inactive"}
          </span>
          {template.status ? (
            <span className="text-xs text-slate-500">
              ({template.status})
            </span>
          ) : null}
        </div>
      </div>
      {phases.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-slate-500">Phases</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {phases
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((p, i) => (
                <li key={`${p.name}-${i}`}>
                  <span className="font-medium">{p.name}</span>
                  {p.description ? (
                    <span className="text-slate-500"> — {p.description}</span>
                  ) : null}
                </li>
              ))}
          </ol>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No phase list on this template.</p>
      )}
    </div>
  );
}

/** Shown when GET /admin/templates/:id/governance returns an empty list (usually local DB without seed migration). */
function GovernanceCatalogEmptyState() {
  return (
    <div className="space-y-4 py-2 text-left text-sm text-slate-600">
      <p className="text-base font-medium text-slate-800">No system policy catalog loaded</p>
      <p>
        The API returned no governance policies, so there is nothing to enable yet. The catalog is
        built from SYSTEM-scoped rows in <code className="rounded bg-slate-100 px-1 font-mono text-xs">governance_rules</code> (seeded by migrations such as the governance policy catalog). Until those
        rows exist, this tab stays empty even though the engine code is present.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Point the app at the backend that owns your database (in dev, Vite proxies{" "}
          <code className="rounded bg-slate-100 px-1 font-mono text-xs">/api</code> to your API).
        </li>
        <li>
          Run pending backend migrations (including the governance catalog seed) against that
          database.
        </li>
        <li>Restart the API if needed, then refresh this page.</li>
      </ol>
      {import.meta.env.DEV ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold text-amber-900">Typical local fix</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-white/80 p-2 font-mono text-[11px] leading-relaxed ring-1 ring-amber-100">
            cd zephix-backend{"\n"}
            npm run build{"\n"}
            npm run db:migrate
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function formatGovernanceLoadError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const st = err.response?.status;
    const body = err.response?.data as { message?: string; code?: string } | undefined;
    const detail =
      typeof body?.message === "string" && body.message.trim()
        ? ` ${body.message.trim()}`
        : "";
    const code =
      typeof body?.code === "string" && body.code.trim() ? ` (${body.code.trim()})` : "";
    if (st === 401) {
      return `Session expired or not signed in (401). Try refreshing the page or logging in again.${detail}`;
    }
    if (st === 403) {
      return `Access denied (403). Organization admin is required, or a stale workspace header blocked this request.${detail}${code}`;
    }
    if (st === 404) {
      return `Not found (404).${detail}`;
    }
    if (st !== undefined && st >= 500) {
      return `Server error (${st}).${detail}${code}`;
    }
    if (st !== undefined) {
      return `Request failed (${st}).${detail}${code}`;
    }
    const net = err.code ? ` (${String(err.code)})` : "";
    return `Network error — no response from API.${net}${detail}`;
  }
  if (err instanceof Error && err.message.trim()) {
    return `Failed to load governance policies: ${err.message.trim()}`;
  }
  return "Failed to load governance policies.";
}

function TemplateGovernanceTab({ template }: { template: TemplatePanelData }) {
  const [policies, setPolicies] = useState<GovernancePolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toggleErrorCode, setToggleErrorCode] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await administrationApi.getTemplateGovernance(template.id);
        if (active) setPolicies(data);
      } catch (err: unknown) {
        console.error("getTemplateGovernance failed", err);
        if (active) setError(formatGovernanceLoadError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [template.id, reloadNonce]);

  const handleToggle = async (code: string) => {
    const policy = policies.find((p) => p.code === code);
    if (!policy) return;

    const newEnabled = !policy.enabled;
    setToggleErrorCode(null);

    setPolicies((prev) =>
      prev.map((p) => (p.code === code ? { ...p, enabled: newEnabled } : p)),
    );

    setSavingCode(code);
    try {
      const updated = await administrationApi.updateTemplateGovernance(template.id, {
        [code]: newEnabled,
      });
      setPolicies(updated);
    } catch (err) {
      setPolicies((prev) =>
        prev.map((p) => (p.code === code ? { ...p, enabled: !newEnabled } : p)),
      );
      setToggleErrorCode(code);
      toast.error("Failed to update policy. Please try again.");
      console.error("Failed to update governance policy:", err);
    } finally {
      setSavingCode(null);
    }
  };

  const methodologyKey = resolveMethodologyKey(template);
  const showAllMethodologies =
    !methodologyKey || methodologyKey === "custom";

  const visiblePolicies: GovernancePolicyWithMeta[] = policies
    .map((p) => {
      const meta = POLICY_UI_META[p.code];
      if (!meta) return null;
      const methodologyMatch =
        showAllMethodologies ||
        meta.methodologies.length >= 5 ||
        meta.methodologies.includes(methodologyKey);
      if (!methodologyMatch) return null;
      return { ...p, meta };
    })
    .filter((row): row is GovernancePolicyWithMeta => row !== null)
    .sort((a, b) => a.meta.tier - b.meta.tier);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="ml-2 text-sm text-slate-500">Loading policies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 py-6 text-center text-sm text-red-600">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => setReloadNonce((n) => n + 1)}
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (policies.length === 0) {
    return <GovernanceCatalogEmptyState />;
  }

  if (visiblePolicies.length === 0) {
    return (
      <div className="space-y-3 py-4 text-left text-sm text-slate-600">
        <p className="font-medium text-slate-800">
          No policies match this template&apos;s methodology
        </p>
        <p>
          Resolved methodology key:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            {methodologyKey || "(none)"}
          </code>
          . The catalog is filtered by methodology; set{" "}
          <strong>methodology</strong> or <strong>deliveryMethod</strong> on the template to a
          known value (for example waterfall, agile, kanban, scrum, or hybrid).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="mb-2 text-xs text-slate-500">
        Configure governance policies for projects created from this template. Changes are
        saved automatically and inherited by new projects.
      </p>

      {visiblePolicies.map((policy) => {
        const { meta } = policy;
        return (
          <div
            key={policy.code}
            className={`rounded-lg border p-3 transition-colors ${
              meta.tier === 3
                ? "border-slate-100 bg-slate-50 opacity-60"
                : policy.enabled
                  ? "border-blue-200 bg-blue-50/30"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {meta.displayName}
                  </span>
                  {meta.tier === 2 ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                      Enforcement coming soon
                    </span>
                  ) : null}
                  {meta.tier === 3 ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      Coming soon
                    </span>
                  ) : null}
                  {policy.enabled && meta.tier <= 2 ? (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>
                <p className="mt-1 text-[10px] text-slate-400">{meta.pmbok}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {meta.methodologies.map((m) => (
                    <span
                      key={m}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] capitalize text-slate-600"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                {toggleErrorCode === policy.code ? (
                  <p className="mt-2 text-xs text-red-600">Could not save. Please try again.</p>
                ) : null}
              </div>

              {meta.tier <= 2 ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={policy.enabled}
                  aria-label={`${policy.enabled ? "Disable" : "Enable"} ${meta.displayName}`}
                  disabled={savingCode === policy.code}
                  onClick={() => void handleToggle(policy.code)}
                  className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                    savingCode === policy.code ? "cursor-wait opacity-50" : "cursor-pointer"
                  } ${policy.enabled ? "bg-blue-600" : "bg-slate-200"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      policy.enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateColumnsTab({ template }: { template: TemplatePanelData }) {
  const cfg = template.columnConfig;
  const keys = cfg ? Object.keys(cfg).filter((k) => cfg[k]) : [];

  return (
    <div className="space-y-3 py-4 text-center text-sm text-slate-500">
      <p>Column configuration for this template.</p>
      {keys.length > 0 ? (
        <div className="mx-auto max-w-sm text-left">
          <p className="text-xs font-medium text-slate-500">
            Enabled columns (from API)
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
            {keys.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          No column defaults on this template row. Defaults can be edited when
          authoring the template in Template Center.
        </p>
      )}
    </div>
  );
}
