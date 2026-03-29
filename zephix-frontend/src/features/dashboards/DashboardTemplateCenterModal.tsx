import { useEffect, useMemo, useState } from "react";
import type { DashboardCardCategory, DashboardCardDefinition } from "./types";
import { Modal } from "@/components/ui/overlay/Modal";

type DashboardTemplateCenterModalProps = {
  open: boolean;
  definitions: DashboardCardDefinition[];
  existingCardKeys: Set<string>;
  onClose: () => void;
  onCreate: (definition: DashboardCardDefinition) => Promise<void> | void;
};

const GROUP_ORDER: DashboardCardCategory[] = [
  "featured",
  "tasks",
  "project-health",
  "resources",
  "governance",
  "ai-insights",
];

const GROUP_LABELS: Record<DashboardCardCategory, string> = {
  featured: "Personal productivity",
  tasks: "Delivery health",
  "project-health": "Delivery health",
  resources: "Resource and capacity",
  governance: "Risk and governance",
  "ai-insights": "AI advisory and insight",
};

export function DashboardTemplateCenterModal({
  open,
  definitions,
  existingCardKeys,
  onClose,
  onCreate,
}: DashboardTemplateCenterModalProps) {
  const [selected, setSelected] = useState<DashboardCardDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setCreating(false);
    setError(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const map = new Map<DashboardCardCategory, DashboardCardDefinition[]>();
    GROUP_ORDER.forEach((category) => map.set(category, []));
    definitions.forEach((definition) => {
      const current = map.get(definition.category) || [];
      map.set(definition.category, [...current, definition]);
    });
    return map;
  }, [definitions]);

  async function handleCreate(definition: DashboardCardDefinition) {
    setCreating(true);
    setError(null);
    try {
      await onCreate(definition);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not add card to dashboard");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Dashboard Templates" size="xl">
      <p className="mb-4 text-sm text-slate-600">Add a template card to this dashboard.</p>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {GROUP_ORDER.map((category) => {
              const cards = grouped.get(category) || [];
              return (
                <section key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {GROUP_LABELS[category]}
                  </h3>
                  {cards.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                      No templates in this category
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {cards.map((definition) => {
                        const exists = existingCardKeys.has(definition.cardKey);
                        return (
                          <button
                            key={definition.cardKey}
                            disabled={exists}
                            onClick={() => setSelected(definition)}
                            className={`rounded-lg border px-3 py-2 text-left ${
                              selected?.cardKey === definition.cardKey
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 hover:bg-slate-50"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <div className="text-sm font-medium text-slate-900">{definition.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {definition.description}
                            </div>
                            {exists ? (
                              <div className="mt-1 text-[11px] font-medium text-slate-500">
                                Already added
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {selected ? (
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-slate-900">{selected.title}</h4>
                <p className="text-sm text-slate-600">{selected.description}</p>
                <div className="text-xs text-slate-500">
                  Data source: {selected.resolverKey}
                </div>
                <button
                  onClick={() => void handleCreate(selected)}
                  disabled={creating || existingCardKeys.has(selected.cardKey)}
                  className="zs-btn-primary disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add card"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Select a card template to continue.
              </p>
            )}
          </aside>
      </div>
    </Modal>
  );
}

