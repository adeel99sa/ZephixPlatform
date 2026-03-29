import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { SettingsPageHeader } from "../components/ui";
import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";
import {
  CORE_TEMPLATES,
  TEMPLATE_CATEGORY_DISPLAY_LABELS,
  type CoreTemplateDefinition,
  type TemplateCategoryFilter,
  getTemplateById,
} from "../templates/templateLibrarySeed";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "published" | "draft";

function matchesFilters(
  row: CoreTemplateDefinition,
  category: TemplateCategoryFilter,
  status: StatusFilter,
): boolean {
  if (category !== "all" && row.category !== category) return false;
  if (status === "published" && row.publishState !== "published") return false;
  if (status === "draft" && row.publishState !== "draft") return false;
  return true;
}

function stateBadge(
  s: CoreTemplateDefinition["publishState"],
): { label: string; className: string } {
  switch (s) {
    case "published":
      return {
        label: "Published",
        className: "bg-emerald-100 text-emerald-900",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-slate-200 text-slate-800",
      };
    default:
      return {
        label: "Deprecated",
        className: "bg-amber-100 text-amber-900 line-through decoration-slate-500",
      };
  }
}

export default function TemplateLibrarySettings(): ReactElement {
  const navigate = useNavigate();
  const [category, setCategory] = useState<TemplateCategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(
    () => CORE_TEMPLATES.filter((t) => matchesFilters(t, category, status)),
    [category, status],
  );

  const hasSelection = selectedId !== null;

  const handleRowNavigate = useCallback(
    (id: string) => {
      navigate(`/settings/template-builder/${id}`);
    },
    [navigate],
  );

  return (
    <div data-settings-template-library>
      <SettingsPageHeader
        title="Template Library"
        description="Manage organization-approved templates for delivery, governance, and portfolio needs."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!hasSelection || !getTemplateById(selectedId ?? "")}
              title={
                hasSelection
                  ? "Open builder with a copy of the selected baseline"
                  : "Select a template row to duplicate"
              }
              onClick={() => {
                if (selectedId && getTemplateById(selectedId)) {
                  navigate("/settings/template-builder/new", {
                    state: { duplicateFrom: selectedId },
                  });
                }
              }}
            >
              Duplicate Selected
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate("/settings/template-builder/new")}
            >
              Create Template
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["Delivery", TEMPLATE_CATEGORY_DISPLAY_LABELS.Delivery],
              ["Product", TEMPLATE_CATEGORY_DISPLAY_LABELS.Product],
              ["PMO", TEMPLATE_CATEGORY_DISPLAY_LABELS.PMO],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setCategory(k)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                category === k
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Status</span>
          <select
            className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-9 min-w-[9rem] max-w-xs")}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filter by publish status"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-10 px-3 py-3" aria-label="Select" />
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Template name
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Methodology
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Governance
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Version
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Last updated
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sb = stateBadge(row.publishState);
              const isSel = selectedId === row.id;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    isSel && "bg-indigo-50/50",
                  )}
                >
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="radio"
                      name="template-pick"
                      className="h-4 w-4 accent-indigo-600"
                      checked={isSel}
                      onChange={() => setSelectedId(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <button
                      type="button"
                      className="text-left font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                      onClick={() => handleRowNavigate(row.id)}
                    >
                      {row.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-700">
                    {TEMPLATE_CATEGORY_DISPLAY_LABELS[row.category]}
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-700">
                    {row.methodology}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-200/80">
                      {row.governanceLevel}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        sb.className,
                      )}
                    >
                      {sb.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle font-mono text-xs text-slate-800">
                    v{row.version}
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-600">
                    {row.lastUpdated}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {rows.length} template{rows.length === 1 ? "" : "s"} shown — core library
        ships with 12 organization-approved baselines. Artifact packs attach at
        template configuration time, not as separate top-level templates.
      </p>
    </div>
  );
}
