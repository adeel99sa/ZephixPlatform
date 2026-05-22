/**
 * B9 — "+ View" popover: add shell tabs from `columnConfig.visibleTabs`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ADDABLE_VIEW_TAB_OPTIONS } from '../layout/projectVisibleTabs';

const COMING_Q3_BADGE = (
  <span
    className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-[#6B7280]"
    style={{ backgroundColor: '#F3F4F6', borderRadius: 4 }}
    title="Available Q3 2026"
  >
    Coming Q3
  </span>
);

const ARTIFACT_OPTIONS = [
  { id: 'risk-register', label: 'Risk Register' },
  { id: 'wbs', label: 'WBS' },
  { id: 'stakeholder-register', label: 'Stakeholder Register' },
  { id: 'lessons-learned', label: 'Lessons Learned' },
] as const;

interface Props {
  visibleTabIds: ReadonlySet<string>;
  onAddViewTab: (tabId: string) => void;
  addingTabId: string | null;
}

export function ProjectAddViewPopover({
  visibleTabIds,
  onAddViewTab,
  addingTabId,
}: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  const hiddenViews = ADDABLE_VIEW_TAB_OPTIONS.filter((opt) => !visibleTabIds.has(opt.id));

  const handleArtifact = () => {
    toast.message('Coming in Q3 2026 — stay tuned!');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Add a view to this project"
        className="flex items-center gap-1.5 border-b-2 border-dashed border-transparent px-1 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
        data-testid="project-add-view-button"
      >
        <Plus className="h-4 w-4" aria-hidden />
        View
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Add to this project"
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg"
        >
          <p className="px-3 pb-2 text-xs font-semibold text-slate-800">Add to this project</p>

          <div className="px-2">
            <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Views
            </p>
            {hiddenViews.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">All views added</p>
            ) : (
              hiddenViews.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  disabled={addingTabId === opt.id}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => {
                    onAddViewTab(opt.id);
                    setOpen(false);
                  }}
                  title={`Add ${opt.label} to this project`}
                >
                  <span>{opt.label}</span>
                </button>
              ))
            )}
          </div>

          <div className="mt-2 border-t border-slate-100 px-2 pt-2">
            <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Artifacts
            </p>
            {ARTIFACT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={handleArtifact}
                title={`${opt.label} — available Q3 2026`}
              >
                <span>{opt.label}</span>
                {COMING_Q3_BADGE}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
