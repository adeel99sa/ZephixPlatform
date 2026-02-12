/**
 * ProjectToolsDropdown
 *
 * Dropdown menu for project tools (Overview, Plan, Sprints, Budget, etc.)
 * Supports pinning up to 3 tools for quick access.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Folder,
  Repeat,
  DollarSign,
  AlertTriangle,
  FileText,
  Paperclip,
  Users,
  Sparkles,
  Shield,
  ChevronDown,
  Pin,
  PinOff,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                   */
/* ------------------------------------------------------------------ */

export interface ToolItem {
  id: string;
  label: string;
  icon: LucideIcon;
  routeSuffix: string; // path segment under /projects/:projectId/tools/
}

export const TOOL_ITEMS: ToolItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, routeSuffix: 'overview' },
  { id: 'plan', label: 'Plan', icon: Folder, routeSuffix: 'plan' },
  { id: 'sprints', label: 'Sprints', icon: Repeat, routeSuffix: 'sprints' },
  { id: 'budget', label: 'Budget', icon: DollarSign, routeSuffix: 'budget' },
  { id: 'risks', label: 'Risks', icon: AlertTriangle, routeSuffix: 'risks' },
  { id: 'changes', label: 'Changes', icon: FileText, routeSuffix: 'changes' },
  { id: 'docs', label: 'Docs', icon: Paperclip, routeSuffix: 'docs' },
  { id: 'workflow', label: 'Doc Workflow', icon: FileText, routeSuffix: 'workflow' },
  { id: 'team', label: 'Team', icon: Users, routeSuffix: 'team' },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles, routeSuffix: 'ai' },
  { id: 'evidence', label: 'Evidence', icon: Shield, routeSuffix: 'evidence' },
];

const MAX_PINS = 3;

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

function getPinnedTools(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(`zephix:pinned-tools:${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PINS) : [];
  } catch {
    return [];
  }
}

function setPinnedTools(projectId: string, pins: string[]): void {
  localStorage.setItem(
    `zephix:pinned-tools:${projectId}`,
    JSON.stringify(pins.slice(0, MAX_PINS)),
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  className?: string;
}

export const ProjectToolsDropdown: React.FC<Props> = ({ className }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() =>
    projectId ? getPinnedTools(projectId) : [],
  );
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync pinned tools when project changes
  useEffect(() => {
    if (projectId) setPinnedIds(getPinnedTools(projectId));
  }, [projectId]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  /* ---- helpers ---- */

  const isToolActive = (tool: ToolItem) =>
    location.pathname.includes(`/tools/${tool.routeSuffix}`);

  const togglePin = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!projectId) return;
    let next: string[];
    if (pinnedIds.includes(toolId)) {
      next = pinnedIds.filter((id) => id !== toolId);
    } else {
      if (pinnedIds.length >= MAX_PINS) return; // silently ignore
      next = [...pinnedIds, toolId];
    }
    setPinnedIds(next);
    setPinnedTools(projectId, next);
  };

  const navigateToTool = (tool: ToolItem) => {
    navigate(`/projects/${projectId}/tools/${tool.routeSuffix}`);
    setOpen(false);
  };

  /* ---- derived ---- */

  const pinnedTools = TOOL_ITEMS.filter((t) => pinnedIds.includes(t.id));

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`} ref={menuRef}>
      {/* Pinned tools as quick-access chips */}
      {pinnedTools.map((tool) => {
        const Icon = tool.icon;
        const active = isToolActive(tool);
        return (
          <button
            key={tool.id}
            onClick={() => navigateToTool(tool)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
              ${active
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
              focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
            `}
          >
            <Icon className="h-3.5 w-3.5" />
            {tool.label}
          </button>
        );
      })}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            ${open
              ? 'bg-slate-200 text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
            focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
          `}
        >
          Project Tools
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            {TOOL_ITEMS.map((tool) => {
              const Icon = tool.icon;
              const active = isToolActive(tool);
              const pinned = pinnedIds.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => navigateToTool(tool)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors group
                    ${active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-50'}
                    focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
                  `}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{tool.label}</span>
                  <button
                    onClick={(e) => togglePin(tool.id, e)}
                    className={`
                      p-0.5 rounded transition-opacity hover:bg-slate-100
                      ${pinned
                        ? 'text-indigo-500 opacity-100'
                        : 'text-slate-400 opacity-0 group-hover:opacity-100'}
                      focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:opacity-100
                    `}
                    title={pinned ? 'Unpin' : pinnedIds.length >= MAX_PINS ? 'Max 3 pins' : 'Pin for quick access'}
                  >
                    {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectToolsDropdown;
