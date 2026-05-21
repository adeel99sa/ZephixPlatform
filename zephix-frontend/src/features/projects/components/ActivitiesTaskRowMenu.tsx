import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  Calendar,
  ChevronRight,
  Copy,
  CornerDownRight,
  ExternalLink,
  Flag,
  GitBranch,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ActivitiesPlanPhase {
  id: string;
  name: string;
}

export type TaskLinkRelation = 'blocks' | 'blocked_by' | 'relates_to';

export type TaskConvertType = 'milestone' | 'meeting_note' | 'subtask';

export interface ActivitiesTaskRowMenuProps {
  taskId: string;
  taskTitle: string;
  isSubtask: boolean;
  currentPhaseId?: string | null;
  phases: readonly ActivitiesPlanPhase[];
  parentTaskCandidates?: ReadonlyArray<{ id: string; title: string }>;
  onOpen: () => void;
  onRename: () => void;
  onAddSubtask: () => void;
  onPromoteToTask?: () => void;
  onMoveToPhase: (phaseId: string) => void;
  onConvertTo: (type: TaskConvertType) => void;
  onConvertToSubtask?: (parentTaskId: string) => void;
  onLinkTo: (type: TaskLinkRelation) => void;
  onDuplicate: () => void;
  onCopyLink: () => void;
  onRequestDelete: () => void;
}

const ROW_ACTION_ITEM =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80';

const ROW_ACTION_DANGER =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40';

type SubView =
  | 'root'
  | 'movePhase'
  | 'convert'
  | 'convertSubtaskParent'
  | 'link'
  | 'linkPicker';

function MenuItem({
  icon,
  label,
  onClick,
  testId,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      title={label}
      disabled={disabled}
      className={danger ? ROW_ACTION_DANGER : ROW_ACTION_ITEM}
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function SubmenuTrigger({
  icon,
  label,
  testId,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      title={label}
      className={`${ROW_ACTION_ITEM} justify-between`}
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

export function ActivitiesTaskRowMenu({
  taskId,
  taskTitle,
  isSubtask,
  currentPhaseId,
  phases,
  parentTaskCandidates = [],
  onOpen,
  onRename,
  onAddSubtask,
  onPromoteToTask,
  onMoveToPhase,
  onConvertTo,
  onConvertToSubtask,
  onLinkTo,
  onDuplicate,
  onCopyLink,
  onRequestDelete,
}: ActivitiesTaskRowMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subView, setSubView] = useState<SubView>('root');
  const [pendingLinkType, setPendingLinkType] = useState<TaskLinkRelation | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setSubView('root');
    setPendingLinkType(null);
  };

  useEffect(() => {
    if (!menuOpen) {
      setSubView('root');
      setPendingLinkType(null);
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

  const submitLinkPick = (targetId: string) => {
    if (pendingLinkType) {
      onLinkTo(pendingLinkType);
      toast.message('Dependencies coming in next update', {
        description: `Selected task ${targetId.slice(0, 8)}…`,
      });
    }
    closeMenu();
  };

  const renderRoot = () => (
    <>
      <MenuItem
        icon={<ExternalLink className="h-3.5 w-3.5 shrink-0" />}
        label="Open"
        testId={`row-menu-open-${taskId}`}
        onClick={() => {
          closeMenu();
          onOpen();
        }}
      />
      <MenuItem
        icon={<Pencil className="h-3.5 w-3.5 shrink-0" />}
        label="Rename"
        testId={`row-menu-rename-${taskId}`}
        onClick={() => {
          closeMenu();
          onRename();
        }}
      />
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
      <MenuItem
        icon={<Plus className="h-3.5 w-3.5 shrink-0" />}
        label={isSubtask ? 'Add Nested Subtask' : 'Add Subtask'}
        testId={`row-menu-add-subtask-${taskId}`}
        onClick={() => {
          closeMenu();
          onAddSubtask();
        }}
      />
      {isSubtask && onPromoteToTask && (
        <MenuItem
          icon={<ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
          label="Promote to Task"
          testId={`row-menu-promote-${taskId}`}
          onClick={() => {
            closeMenu();
            onPromoteToTask();
          }}
        />
      )}
      <SubmenuTrigger
        icon={<Calendar className="h-3.5 w-3.5 shrink-0" />}
        label="Move to Phase"
        testId={`row-menu-move-phase-${taskId}`}
        onClick={() => setSubView('movePhase')}
      />
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
      <SubmenuTrigger
        icon={<Flag className="h-3.5 w-3.5 shrink-0" />}
        label="Convert to"
        testId={`row-menu-convert-${taskId}`}
        onClick={() => setSubView('convert')}
      />
      <SubmenuTrigger
        icon={<GitBranch className="h-3.5 w-3.5 shrink-0" />}
        label="Link to"
        testId={`row-menu-link-${taskId}`}
        onClick={() => setSubView('link')}
      />
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
      <MenuItem
        icon={<Copy className="h-3.5 w-3.5 shrink-0" />}
        label="Duplicate"
        testId={`row-menu-duplicate-${taskId}`}
        onClick={() => {
          closeMenu();
          onDuplicate();
        }}
      />
      <MenuItem
        icon={<Link2 className="h-3.5 w-3.5 shrink-0" />}
        label="Copy Link"
        testId={`row-menu-copy-link-${taskId}`}
        onClick={() => {
          closeMenu();
          onCopyLink();
        }}
      />
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
      <MenuItem
        icon={<Trash2 className="h-3.5 w-3.5 shrink-0" />}
        label="Delete"
        testId={`row-menu-delete-${taskId}`}
        danger
        onClick={() => {
          closeMenu();
          onRequestDelete();
        }}
      />
    </>
  );

  const renderMovePhase = () => (
    <>
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Move to Phase
      </div>
      {phases.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500 italic">No phases available</p>
      ) : (
        phases.map((phase) => (
          <button
            key={phase.id}
            type="button"
            role="menuitem"
            title={phase.name}
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
  );

  const renderConvert = () => (
    <>
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Convert to
      </div>
      <MenuItem
        icon={<Bookmark className="h-3.5 w-3.5 shrink-0" />}
        label="Milestone"
        testId={`row-menu-convert-milestone-${taskId}`}
        onClick={() => {
          closeMenu();
          onConvertTo('milestone');
        }}
      />
      <MenuItem
        icon={<Calendar className="h-3.5 w-3.5 shrink-0" />}
        label="Meeting Note"
        testId={`row-menu-convert-meeting-${taskId}`}
        onClick={() => {
          closeMenu();
          onConvertTo('meeting_note');
        }}
      />
      {!isSubtask && (onConvertToSubtask || parentTaskCandidates.length > 0) && (
        <SubmenuTrigger
          icon={<CornerDownRight className="h-3.5 w-3.5 shrink-0" />}
          label="Subtask"
          testId={`row-menu-convert-subtask-${taskId}`}
          onClick={() => setSubView('convertSubtaskParent')}
        />
      )}
    </>
  );

  const renderConvertSubtaskParent = () => (
    <>
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Pick parent task
      </div>
      {parentTaskCandidates.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500 italic">No parent tasks available</p>
      ) : (
        parentTaskCandidates.map((parent) => (
          <button
            key={parent.id}
            type="button"
            role="menuitem"
            title={parent.title}
            className={ROW_ACTION_ITEM}
            data-testid={`row-menu-convert-parent-${parent.id}-${taskId}`}
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              if (onConvertToSubtask) {
                onConvertToSubtask(parent.id);
              } else {
                onConvertTo('subtask');
              }
            }}
          >
            <span className="truncate">{parent.title}</span>
          </button>
        ))
      )}
    </>
  );

  const renderLink = () => (
    <>
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Link to
      </div>
      <MenuItem
        icon={<ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
        label="Blocks a task"
        testId={`row-menu-link-blocks-${taskId}`}
        onClick={() => {
          setPendingLinkType('blocks');
          setSubView('linkPicker');
        }}
      />
      <MenuItem
        icon={<ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
        label="Blocked by a task"
        testId={`row-menu-link-blocked-${taskId}`}
        onClick={() => {
          setPendingLinkType('blocked_by');
          setSubView('linkPicker');
        }}
      />
      <MenuItem
        icon={<GitBranch className="h-3.5 w-3.5 shrink-0" />}
        label="Relates to"
        testId={`row-menu-link-relates-${taskId}`}
        onClick={() => {
          setPendingLinkType('relates_to');
          setSubView('linkPicker');
        }}
      />
    </>
  );

  const renderLinkPicker = () => (
    <>
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Select task
      </div>
      {parentTaskCandidates.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500 italic">No tasks available</p>
      ) : (
        parentTaskCandidates
          .filter((t) => t.id !== taskId)
          .map((target) => (
            <button
              key={target.id}
              type="button"
              role="menuitem"
              title={target.title}
              className={ROW_ACTION_ITEM}
              data-testid={`row-menu-link-target-${target.id}-${taskId}`}
              onClick={(e) => {
                e.stopPropagation();
                submitLinkPick(target.id);
              }}
            >
              <span className="truncate">{target.title}</span>
            </button>
          ))
      )}
    </>
  );

  let panel: React.ReactNode;
  switch (subView) {
    case 'movePhase':
      panel = renderMovePhase();
      break;
    case 'convert':
      panel = renderConvert();
      break;
    case 'convertSubtaskParent':
      panel = renderConvertSubtaskParent();
      break;
    case 'link':
      panel = renderLink();
      break;
    case 'linkPicker':
      panel = renderLinkPicker();
      break;
    default:
      panel = renderRoot();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        title={`Actions for ${taskTitle}`}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
          if (!menuOpen) setSubView('root');
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
          className="absolute right-0 top-full z-20 mt-1 min-w-[14rem] max-h-[min(24rem,70vh)] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:shadow-slate-950/40"
        >
          {panel}
        </div>
      )}
    </div>
  );
}
