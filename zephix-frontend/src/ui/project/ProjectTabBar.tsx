import { useCallback, useEffect, useMemo, type ReactElement } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { getErrorMessage } from "@/lib/api/errors";
import { projectShellTabIcon } from "@/features/projects/constants/project-shell-tab-icons";
import {
  ALLOWED_PROJECT_SHELL_TAB_KEYS,
  PROJECT_SHELL_TAB_LABELS,
  buildProgressiveShellTabs,
  firstAllowedPathSegment,
  isProjectShellTabKeyRemovable,
  isShellRouteAllowed,
  normalizeActiveTabsList,
  parseProjectShellSegment,
} from "@/features/projects/constants/project-shell-tabs";
import { useProjectContext } from "@/features/projects/layout/ProjectPageContext";
import { usePatchProject } from "@/features/projects/hooks";
import { AnchoredMenu, type AnchoredMenuItem } from "@/ui/shell/AnchoredMenu";

export type ProjectTabBarProps = {
  projectId: string;
};

/**
 * Progressive disclosure: only tabs listed in `project.activeTabs` (normalized) are shown.
 * Deep links to a hidden route are redirected to the first allowed tab.
 */
export function ProjectTabBar({ projectId }: ProjectTabBarProps): ReactElement {
  const { project, loading, error, refresh } = useProjectContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { canWrite } = useWorkspaceRole(project?.workspaceId ?? null);
  const patchProject = usePatchProject();

  const normalizedTabs = useMemo(
    () => normalizeActiveTabsList(project?.activeTabs),
    [project?.activeTabs],
  );

  const navItems = useMemo(
    () => buildProgressiveShellTabs(normalizedTabs),
    [normalizedTabs],
  );

  /** Keys user can add (always-on overview/tasks excluded). */
  const addableTabKeys = useMemo(
    () =>
      ALLOWED_PROJECT_SHELL_TAB_KEYS.filter(
        (k) => k !== "overview" && k !== "tasks" && !normalizedTabs.includes(k),
      ),
    [normalizedTabs],
  );

  const handleAddTab = useCallback(
    async (key: string) => {
      if (!projectId || !project) return;
      try {
        const nextTabs = [...normalizedTabs, key];
        await patchProject.mutateAsync({
          projectId,
          payload: { activeTabs: nextTabs },
        });
        await refresh();
        toast.success("Tab added");
        const segment = parseProjectShellSegment(location.pathname);
        const after = normalizeActiveTabsList(nextTabs);
        if (segment && !isShellRouteAllowed(segment, after)) {
          navigate(`/projects/${projectId}/${firstAllowedPathSegment(after)}`, {
            replace: true,
          });
        }
      } catch (e: unknown) {
        toast.error(getErrorMessage(e));
      }
    },
    [
      location.pathname,
      navigate,
      normalizedTabs,
      patchProject,
      project,
      projectId,
      refresh,
    ],
  );

  const handleRemoveTab = useCallback(
    async (key: string) => {
      if (!projectId || !project) return;
      if (!isProjectShellTabKeyRemovable(key, project.governanceLevel)) {
        return;
      }
      try {
        const nextTabs = normalizedTabs.filter((k) => k !== key);
        await patchProject.mutateAsync({
          projectId,
          payload: { activeTabs: nextTabs },
        });
        await refresh();
        toast.success("Tab removed");
        const segment = parseProjectShellSegment(location.pathname);
        const after = normalizeActiveTabsList(nextTabs);
        if (segment && !isShellRouteAllowed(segment, after)) {
          navigate(`/projects/${projectId}/overview`, { replace: true });
        }
      } catch (e: unknown) {
        toast.error(getErrorMessage(e));
      }
    },
    [
      location.pathname,
      navigate,
      normalizedTabs,
      patchProject,
      project,
      projectId,
      refresh,
    ],
  );

  const addTabMenuItems = useMemo((): AnchoredMenuItem[] => {
    return addableTabKeys.map((key) => ({
      id: `add-${key}`,
      label: PROJECT_SHELL_TAB_LABELS[key] ?? key,
      icon: projectShellTabIcon(key),
      onClick: (): void => {
        void handleAddTab(key);
      },
    }));
  }, [addableTabKeys, handleAddTab]);

  const currentSegment = useMemo(() => {
    const raw = parseProjectShellSegment(location.pathname);
    if (!raw) return "overview";
    return raw;
  }, [location.pathname]);

  useEffect(() => {
    if (loading || error || !project) return;
    if (isShellRouteAllowed(currentSegment, normalizedTabs)) return;
    const next = firstAllowedPathSegment(normalizedTabs);
    navigate(`/projects/${projectId}/${next}`, { replace: true });
  }, [
    loading,
    error,
    project,
    currentSegment,
    normalizedTabs,
    navigate,
    projectId,
  ]);

  if (loading || !project) {
    return (
      <nav
        className="flex h-10 items-center gap-2 border-b border-slate-200 bg-white px-4"
        aria-busy="true"
        aria-label="Loading project tabs"
      >
        <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-16 animate-pulse rounded bg-slate-100" />
      </nav>
    );
  }

  if (error) {
    return <div className="border-b border-slate-200 bg-white" />;
  }

  const showAddMenu = canWrite && addableTabKeys.length > 0;
  const showAddDisabled = canWrite && addableTabKeys.length === 0;

  return (
    <nav
      className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-4 py-2"
      aria-label="Project sections"
    >
      {navItems.map((tab) => {
        const removable =
          canWrite &&
          isProjectShellTabKeyRemovable(tab.tabKey, project.governanceLevel);
        return (
          <div
            key={`${tab.tabKey}-${tab.pathSegment}`}
            className="group relative flex items-center"
          >
            <NavLink
              to={`/projects/${projectId}/${tab.pathSegment}`}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm transition-colors ${
                  removable ? "pr-1" : ""
                } ${
                  isActive
                    ? "bg-indigo-50 font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {tab.label}
            </NavLink>
            {removable ? (
              <button
                type="button"
                disabled={patchProject.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleRemoveTab(tab.tabKey);
                }}
                className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 disabled:opacity-40"
                aria-label={`Remove ${tab.label} tab`}
                title={`Remove ${tab.label}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        );
      })}

      {showAddMenu ? (
        <AnchoredMenu
          align="left"
          widthClass="w-56"
          items={addTabMenuItems}
          trigger={({ ref, onClick, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={onClick}
              title="Add project tab"
              disabled={patchProject.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
              aria-label="Add tab"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          )}
        />
      ) : null}

      {showAddDisabled ? (
        <button
          type="button"
          disabled
          title="All tabs enabled"
          className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300"
          aria-label="All project tabs are enabled"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </nav>
  );
}
