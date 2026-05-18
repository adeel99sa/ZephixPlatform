import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Copy,
  CornerDownRight,
  FolderSync,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

export interface ActivitiesPlanPhase {
  id: string;
  name: string;
}

interface ActivitiesTaskRowMenuProps {
  taskId: string;
  taskTitle: string;
  currentPhaseId: string | null | undefined;
  phases: readonly ActivitiesPlanPhase[];
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onMoveToPhase: (phaseId: string) => void;
  onRequestDelete: () => void;
  /** When set, shows "Convert to subtask" with a parent-task picker. */
  parentTaskCandidates?: readonly { id: string; title: string }[];
  onConvertToSubtask?: (parentTaskId: string) => void;
}

const ROW_ACTION_ITEM =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80';

export function ActivitiesTaskRowMenu({
  taskId,
  taskTitle,
  currentPhaseId,
  phases,
  onEdit,
  onDuplicate,
  onArchive,
  onMoveToPhase,
  onRequestDelete,
  parentTaskCandidates = [],
  onConvertToSubtask,
}: ActivitiesTaskRowMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [movePhaseOpen, setMovePhaseOpen] = useState(false);
  const [convertSubtaskOpen, setConvertSubtaskOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setMovePhaseOpen(false);
    setConvertSubtaskOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) {
      setMovePhaseOpen(false);
      setConvertSubtaskOpen(false);
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
          setMovePhaseOpen(false);
          setConvertSubtaskOpen(false);
        }}
        aria-label={`Row actions for ${taskTitle}`}
        aria-expanded={menuOpen}
        data-testid={`row-menu-button-${taskId}`}
        className={`inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-opacity dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div
          role="menu"
          data-testid={`row-menu-${taskId}`}
          className="absolute right-0 top-full z-20 mt-1 min-w-[13rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:shadow-slate-950/40"
        >
          {convertSubtaskOpen ? (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Convert to subtask
              </div>
              {parentTaskCandidates.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500 italic">No parent tasks available</p>
              ) : (
                parentTaskCandidates.map((parent) => (
                  <button
                    key={parent.id}
                    type="button"
                    role="menuitem"
                    className={ROW_ACTION_ITEM}
                    data-testid={`row-menu-convert-parent-${parent.id}-${taskId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      onConvertToSubtask?.(parent.id);
                    }}
                  >
                    <span className="truncate">{parent.title}</span>
                  </button>
                ))
              )}
            </>
          ) : !movePhaseOpen ? (
            <>
              <button
                type="button"
                role="menuitem"
                className={ROW_ACTION_ITEM}
                data-testid={`row-menu-edit-${taskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onEdit();
                }}
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className={ROW_ACTION_ITEM}
                data-testid={`row-menu-duplicate-${taskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onDuplicate();
                }}
              >
                <Copy className="h-3.5 w-3.5 shrink-0" />
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                className={ROW_ACTION_ITEM}
                data-testid={`row-menu-move-phase-${taskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMovePhaseOpen(true);
                }}
              >
                <FolderSync className="h-3.5 w-3.5 shrink-0" />
                Move to phase
              </button>
              {onConvertToSubtask && (
                <button
                  type="button"
                  role="menuitem"
                  className={ROW_ACTION_ITEM}
                  data-testid={`row-menu-convert-subtask-${taskId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvertSubtaskOpen(true);
                  }}
                >
                  <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                  Convert to subtask
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className={ROW_ACTION_ITEM}
                data-testid={`row-menu-archive-${taskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onArchive();
                }}
              >
                <Archive className="h-3.5 w-3.5 shrink-0" />
                Archive
              </button>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
              <button
                type="button"
                role="menuitem"
                className={`${ROW_ACTION_ITEM} text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`}
                data-testid={`row-menu-delete-${taskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  onRequestDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Delete
              </button>
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Move to phase
              </div>
              {phases.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500 italic">No phases available</p>
              ) : (
                phases.map((phase) => (
                  <button
                    key={phase.id}
                    type="button"
                    role="menuitem"
                    disabled={phase.id === currentPhaseId}
                    className={`${ROW_ACTION_ITEM} disabled:cursor-not-allowed disabled:opacity-50`}
                    data-testid={`row-menu-move-phase-target-${phase.id}-${taskId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      if (phase.id !== currentPhaseId) onMoveToPhase(phase.id);
                    }}
                  >
                    {phase.name}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
