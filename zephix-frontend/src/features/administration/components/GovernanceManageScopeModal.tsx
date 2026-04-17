import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/overlay/Modal";
import {
  administrationApi,
  type AdminTemplate,
  type GovernanceCatalogItem,
} from "@/features/administration/api/administration.api";
import { cn } from "@/lib/utils";

type ScopeMode = "global" | "specific";

export function GovernanceManageScopeModal({
  policy,
  isOpen,
  onClose,
  onSaved,
}: {
  policy: GovernanceCatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [scopeMode, setScopeMode] = useState<ScopeMode>("specific");
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingGov, setLoadingGov] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const policyCode = policy?.code ?? "";

  const load = useCallback(async () => {
    if (!policy || !isOpen) return;
    setLoadingList(true);
    try {
      const rows = await administrationApi.listTemplates();
      setTemplates(Array.isArray(rows) ? rows : []);
    } catch {
      toast.error("Could not load templates.");
      setTemplates([]);
    } finally {
      setLoadingList(false);
    }
  }, [isOpen, policy]);

  const hydrateSelections = useCallback(async () => {
    if (!policy || !isOpen || templates.length === 0) return;
    setLoadingGov(true);
    try {
      const checks = await Promise.all(
        templates.map(async (t) => {
          try {
            const gov = await administrationApi.getTemplateGovernance(t.id);
            const row = gov.find((g) => g.code === policy.code);
            return { id: t.id, enabled: Boolean(row?.enabled) };
          } catch {
            return { id: t.id, enabled: false };
          }
        }),
      );
      setSelectedIds(new Set(checks.filter((c) => c.enabled).map((c) => c.id)));
    } finally {
      setLoadingGov(false);
    }
  }, [isOpen, policy, templates]);

  useEffect(() => {
    if (!isOpen || !policy) return;
    void load();
  }, [isOpen, policy, load]);

  useEffect(() => {
    if (!isOpen || !policy || templates.length === 0) return;
    void hydrateSelections();
  }, [isOpen, policy, templates, hydrateSelections]);

  useEffect(() => {
    if (!isOpen) {
      setScopeMode("specific");
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const toggleTemplate = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!policy) return;
    setSaving(true);
    try {
      const ids = templates.map((t) => t.id);
      if (ids.length === 0) {
        toast.message("No templates available to configure.");
        return;
      }
      if (scopeMode === "global") {
        await Promise.all(
          ids.map((id) =>
            administrationApi.updateTemplateGovernance(id, { [policyCode]: true }),
          ),
        );
      } else {
        await Promise.all(
          ids.map((id) =>
            administrationApi.updateTemplateGovernance(id, {
              [policyCode]: selectedIds.has(id),
            }),
          ),
        );
      }
      toast.success("Policy scope saved.");
      onSaved();
      onClose();
    } catch {
      toast.error("Could not save policy scope. Try again or use Templates.");
    } finally {
      setSaving(false);
    }
  };

  if (!policy) {
    return <></>;
  }

  const orgTemplates = templates.filter((t) => !t.isSystem);
  const systemTemplates = templates.filter((t) => t.isSystem);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage scope: ${policy.name}`}
      size="lg"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose whether this policy applies organization-wide on every template, or only on the templates you
          select. Changes update template governance flags directly.
        </p>

        {loadingList || loadingGov ? (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading templates…
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80",
                )}
              >
                <input
                  type="radio"
                  name="scope-mode"
                  className="mt-1"
                  checked={scopeMode === "global"}
                  onChange={() => setScopeMode("global")}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Global organization default</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enable this policy on every active template. New projects inherit it from their template.
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80",
                )}
              >
                <input
                  type="radio"
                  name="scope-mode"
                  className="mt-1"
                  checked={scopeMode === "specific"}
                  onChange={() => setScopeMode("specific")}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Specific templates</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose which templates have this policy enabled. Templates you leave unchecked will have it turned
                    off.
                  </p>
                </div>
              </label>
            </div>

            {scopeMode === "specific" ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select templates</h4>
                {orgTemplates.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Organization templates
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      {orgTemplates.map((template) => (
                        <label
                          key={template.id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(template.id)}
                            onChange={() => toggleTemplate(template.id)}
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-200">{template.name}</span>
                          <span className="ml-auto text-xs text-gray-400">
                            {(template.deliveryMethod ?? template.methodology ?? "").toString() || "—"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {systemTemplates.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Template center (library)
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      {systemTemplates.map((template) => (
                        <label
                          key={template.id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(template.id)}
                            onChange={() => toggleTemplate(template.id)}
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-200">{template.name}</span>
                          <span className="ml-auto text-xs text-gray-400">
                            {(template.deliveryMethod ?? template.methodology ?? "").toString() || "—"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {orgTemplates.length === 0 && systemTemplates.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No templates found for this organization.</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save scope"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
