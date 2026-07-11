/**
 * B7 — Project header (...) overflow menu.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Copy, MoreHorizontal } from 'lucide-react';

import { useProjectPermissions } from '../hooks/useProjectPermissions';
import type { ProjectDetail } from '../projects.api';

interface Props {
  project: ProjectDetail;
  onSaveAsTemplate: () => void;
  onDuplicateProject: () => void;
}

export function ProjectHeaderActionsMenu({
  project,
  onSaveAsTemplate,
  onDuplicateProject,
}: Props): React.ReactElement | null {
  const { canSaveAsTemplate, canDuplicateProject, loading } = useProjectPermissions(project);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading || (!canSaveAsTemplate && !canDuplicateProject)) {
    return null;
  }

  return (
    <div ref={menuRef} className="absolute right-4 top-4 z-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Project actions"
        title="Project actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/50 text-slate-600 shadow-sm transition hover:bg-white/80"
        data-testid="project-header-actions-menu"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {canDuplicateProject ? (
            <button
              type="button"
              role="menuitem"
              data-testid="project-action-duplicate"
              title="Create a copy of this project in the workspace"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onDuplicateProject();
              }}
            >
              <Copy className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Duplicate project
            </button>
          ) : null}
          {canSaveAsTemplate ? (
            <button
              type="button"
              role="menuitem"
              data-testid="project-action-save-as-template"
              title="Save this project as a reusable template"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onSaveAsTemplate();
              }}
            >
              <BookmarkPlus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Save as template
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
