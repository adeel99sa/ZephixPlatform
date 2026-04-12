/**
 * ProjectTasksTab
 *
 * Tasks tab content - renders the task list for the project.
 * Gear icon + project actions menu live here so they're available for ALL methodologies.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  BookmarkPlus,
  Copy,
  Link2,
  ListTodo,
  Loader2,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { TaskListSection } from '../components/TaskListSection';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { WaterfallTable } from '../waterfall/WaterfallTable';

export const ProjectTasksTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const [searchParams] = useSearchParams();

  // Shared gear icon state — controls the customize view panel for all methodologies.
  const [customizeViewOpen, setCustomizeViewOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);

  // Project actions ... menu
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // Close project menu on click outside
  useEffect(() => {
    if (!projectMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectMenuOpen]);

  // Close project menu on Escape
  useEffect(() => {
    if (!projectMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProjectMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [projectMenuOpen]);

  // Handle taskId highlight from URL
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      setTimeout(() => {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskRow) {
          taskRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskRow.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => {
            taskRow.classList.remove('ring-2', 'ring-blue-500');
          }, 3000);
        }
      }, 500);
    }
  }, [searchParams]);

  if (!projectId) {
    return (
      <EmptyState
        title="Project not found"
        description="Unable to load tasks without a project."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  if (!workspaceId) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Please select a workspace to view tasks."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  const ctx = useProjectContext();
  const isWaterfall =
    (ctx.project?.methodology || '').toLowerCase() === 'waterfall';

  const handleClose = useCallback(() => setCustomizeViewOpen(false), []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div id="task-list-section">
      {/* Shared toolbar — visible for ALL methodologies */}
      <div className="mb-2 flex items-center justify-end gap-2 px-1">
        {/* Gear icon */}
        <div className="relative">
          <button
            ref={gearRef}
            type="button"
            onClick={() => setCustomizeViewOpen((v) => !v)}
            aria-label="Customize view"
            data-testid="customize-view-button"
            title="Customize view (fields, filters, grouping)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <Settings className="h-4 w-4" />
          </button>

          {customizeViewOpen && !isWaterfall && (
            <NonWaterfallCustomizePopover onClose={handleClose} anchorRef={gearRef} />
          )}
        </div>

        {/* Project actions ... menu */}
        <div className="relative" ref={projectMenuRef}>
          <button
            type="button"
            onClick={() => setProjectMenuOpen((v) => !v)}
            aria-label="Project actions"
            data-testid="project-actions-menu-button"
            title="Project actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {projectMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              <button
                type="button"
                onClick={() => { ctx.openSaveAsTemplate(); setProjectMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                data-testid="toolbar-action-save-as-template"
              >
                <BookmarkPlus className="h-4 w-4 text-slate-400" />
                Save as template
              </button>
              <button
                type="button"
                onClick={() => { ctx.openDuplicateProject(); setProjectMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                data-testid="toolbar-action-duplicate"
              >
                <Copy className="h-4 w-4 text-slate-400" />
                Duplicate project
              </button>
              <button
                type="button"
                onClick={() => { handleCopyLink(); setProjectMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                data-testid="toolbar-action-copy-link"
              >
                <Link2 className="h-4 w-4 text-slate-400" />
                Copy link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Methodology-specific content */}
      {isWaterfall ? (
        <WaterfallTable
          projectId={projectId}
          workspaceId={workspaceId}
          customizeViewOpen={customizeViewOpen}
          onCustomizeViewClose={handleClose}
          gearAnchorRef={gearRef}
        />
      ) : (
        <TaskListSection projectId={projectId} workspaceId={workspaceId} />
      )}
    </div>
  );
};

/** Lightweight popover for non-waterfall projects. */
const NonWaterfallCustomizePopover: React.FC<{
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}> = ({ onClose, anchorRef }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)
          && !(anchorRef?.current && anchorRef.current.contains(target))) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-xl"
      role="dialog"
      aria-label="Customize view"
      data-testid="customize-view-panel"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Settings className="h-4 w-4 text-slate-500" />
          Customize view
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Loader2 className="h-3.5 w-3.5" />
          <span className="font-medium">Coming soon</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Column configuration for this project type will be available in a future release.
        </p>
      </div>
    </div>
  );
};

export default ProjectTasksTab;
