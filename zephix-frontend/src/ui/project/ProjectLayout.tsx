import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  LayoutTemplate,
  MoreHorizontal,
  Settings,
  Shield,
  Star,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { ProjectTabBar } from "./ProjectTabBar";

import { TemplateDeltaReviewModal } from "@/features/projects/components/TemplateDeltaReviewModal";
import { ProjectShareModal } from "@/features/projects/components/ProjectShareModal";
import {
  ProjectPageContextBody,
  ProjectPageContextProvider,
  useProjectContext,
} from "@/features/projects/layout/ProjectPageContext";
import { projectsApi, type ProjectDetail } from "@/features/projects/projects.api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useFavoritesStore } from "@/state/favorites.store";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { AnchoredMenu, type AnchoredMenuItem } from "@/ui/shell/AnchoredMenu";
import { EmptyState } from "@/ui/components/EmptyState";
import { PageHeader } from "@/ui/components/PageHeader";
import { getErrorMessage } from "@/lib/api/errors";

function getTemplateBinding(
  project: ProjectDetail | null,
): ProjectDetail["templateBinding"] | null {
  if (!project) return null;
  const direct = project.templateBinding;
  if (direct) return direct;
  const legacy = (project as { template_binding?: ProjectDetail["templateBinding"] })
    .template_binding;
  return legacy ?? null;
}

function isTemplateOutOfSync(project: ProjectDetail | null): boolean {
  const b = getTemplateBinding(project);
  const status = b?.syncStatus ?? (b as { sync_status?: string } | undefined)?.sync_status;
  return status === "OUT_OF_SYNC";
}

function ProjectLayoutChrome() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, loading: projectLoading, refresh: refreshProject } = useProjectContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const { role: workspaceRole, canWrite } = useWorkspaceRole(activeWorkspaceId ?? null);
  const [templateDeltaModalOpen, setTemplateDeltaModalOpen] = useState(false);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareProject, setShareProject] = useState<ProjectDetail | null>(null);

  const canManageAccess =
    workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  const workspaceIdForFavorites =
    shareProject?.workspaceId ?? project?.workspaceId ?? activeWorkspaceId ?? undefined;
  const favoriteRef = useMemo(
    () =>
      ({
        type: "project" as const,
        id: projectId ?? "",
        workspaceId: workspaceIdForFavorites,
      }),
    [projectId, workspaceIdForFavorites],
  );
  const isFav = projectId ? isFavorite(favoriteRef) : false;

  const displayName =
    projectLoading && !project?.name
      ? "Loading…"
      : project?.name?.trim() || "Project";

  const health = project?.health ?? "HEALTHY";
  const healthPresentation = (() => {
    switch (health) {
      case "AT_RISK":
        return {
          label: "At risk",
          pillClass:
            "bg-amber-50 text-amber-800 ring-amber-600/20",
          dotClass: "bg-amber-500",
        };
      case "BLOCKED":
        return {
          label: "Blocked",
          pillClass:
            "bg-red-50 text-red-800 ring-red-600/20",
          dotClass: "bg-red-500",
        };
      case "HEALTHY":
      default:
        return {
          label: "On track",
          pillClass:
            "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
          dotClass: "bg-emerald-500",
        };
    }
  })();

  useEffect(() => {
    if (!shareModalOpen || !projectId) return;
    let cancelled = false;
    void projectsApi
      .getProject(projectId)
      .then((p) => {
        if (!cancelled) setShareProject(p);
      })
      .catch(() => {
        if (!cancelled) setShareProject(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareModalOpen, projectId]);

  const handleShareChanged = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await projectsApi.getProject(projectId);
      setShareProject(p);
    } catch {
      setShareProject(null);
    }
  }, [projectId]);

  const openAccessControl = useCallback(() => {
    if (!projectId) return;
    const ws =
      activeWorkspaceId ?? project?.workspaceId ?? shareProject?.workspaceId;
    if (!ws) {
      toast.error("Workspace context is still loading. Try again in a moment.");
      return;
    }
    if (!canManageAccess) {
      toast.message("Access Control", {
        description:
          "Only workspace owners and admins can manage who can access this project.",
      });
      return;
    }
    setShareModalOpen(true);
  }, [
    activeWorkspaceId,
    canManageAccess,
    project?.workspaceId,
    projectId,
    shareProject?.workspaceId,
  ]);

  const openWorkspaceSettings = useCallback(() => {
    const ws =
      project?.workspaceId ?? activeWorkspaceId ?? shareProject?.workspaceId;
    if (!ws) {
      toast.error("Workspace context is still loading. Try again in a moment.");
      return;
    }
    navigate(`/workspaces/${ws}/settings`);
  }, [navigate, project?.workspaceId, activeWorkspaceId, shareProject?.workspaceId]);

  const goToTemplates = useCallback(() => {
    navigate("/templates");
  }, [navigate]);

  const archiveProject = useCallback(async () => {
    if (!projectId) return;
    if (
      !window.confirm(
        "Archive this project? It will be removed from the active project list. You can restore it from Archived projects.",
      )
    ) {
      return;
    }
    try {
      await projectsApi.deleteProject(projectId);
      toast.success("Project archived");
      navigate("/projects");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }, [projectId, navigate]);

  const deleteProject = useCallback(async () => {
    if (!projectId) return;
    if (
      !window.confirm(
        "Delete this project permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await projectsApi.deleteProject(projectId);
      toast.success("Project deleted");
      navigate("/projects");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }, [projectId, navigate]);

  const moreMenuItems = useMemo((): AnchoredMenuItem[] => {
    if (!projectId) return [];
    const favName = shareProject?.name ?? project?.name ?? "Project";
    return [
      {
        id: "settings",
        label: "Workspace settings",
        icon: Settings,
        onClick: openWorkspaceSettings,
      },
      {
        id: "favorite",
        label: isFav ? "Remove from favorites" : "Add to favorites",
        icon: Star,
        onClick: () => {
          if (isFav) {
            removeFavorite(favoriteRef);
            toast.success("Removed from favorites");
          } else {
            addFavorite({
              type: "project",
              id: projectId,
              name: favName,
              workspaceId: workspaceIdForFavorites,
            });
            toast.success("Added to favorites");
          }
        },
      },
      {
        id: "archive",
        label: "Archive Project",
        icon: Archive,
        divider: true,
        onClick: () => void archiveProject(),
      },
      {
        id: "delete",
        label: "Delete Project",
        icon: Trash2,
        danger: true,
        onClick: () => void deleteProject(),
      },
    ];
  }, [
    addFavorite,
    archiveProject,
    deleteProject,
    favoriteRef,
    isFav,
    openWorkspaceSettings,
    project?.name,
    projectId,
    removeFavorite,
    shareProject?.name,
    workspaceIdForFavorites,
  ]);

  const shareWorkspaceId =
    shareProject?.workspaceId ??
    project?.workspaceId ??
    activeWorkspaceId ??
    "";

  const showTemplateOutOfSyncBanner =
    !projectLoading && project && isTemplateOutOfSync(project);

  return (
    <>
      {showTemplateOutOfSyncBanner ? (
        <div
          className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden
            />
            <p className="min-w-0 leading-snug">
              The master template for this project has been updated.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTemplateDeltaModalOpen(true)}
            className="shrink-0 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 ring-1 ring-inset ring-amber-300/80 transition-colors hover:bg-amber-200/80"
          >
            Review changes
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <PageHeader
          title={displayName}
          subtitle="Governed delivery unit"
          className="min-w-0 border-none px-0 py-0 shadow-none"
        />
        <div className="flex shrink-0 items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${healthPresentation.pillClass}`}
            title={`Project health: ${healthPresentation.label}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${healthPresentation.dotClass}`}
              aria-hidden
            />
            {healthPresentation.label}
            {health === "AT_RISK" || health === "BLOCKED" ? (
              <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            ) : null}
          </div>

          <div className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />

          <button
            type="button"
            onClick={openAccessControl}
            title="Manage who can access this project"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Shield className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="hidden sm:inline">Access Control</span>
          </button>

          <button
            type="button"
            onClick={goToTemplates}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <LayoutTemplate className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="hidden md:inline">Templates</span>
            <span className="md:hidden">Templates</span>
          </button>

          <AnchoredMenu
            align="right"
            widthClass="w-52"
            items={moreMenuItems}
            trigger={({ ref, onClick, open }) => (
              <button
                ref={ref}
                type="button"
                onClick={onClick}
                aria-label="More project actions"
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          />
        </div>
      </div>
      <ProjectTabBar projectId={projectId!} />
      <div className="min-h-0 flex-1 overflow-auto">
        <ProjectPageContextBody />
      </div>

      {shareWorkspaceId ? (
        <ProjectShareModal
          open={shareModalOpen}
          projectId={projectId!}
          workspaceId={shareWorkspaceId}
          projectName={shareProject?.name ?? project?.name ?? "Project"}
          project={shareProject ?? project}
          onClose={() => setShareModalOpen(false)}
          onChanged={handleShareChanged}
        />
      ) : null}

      {projectId ? (
        <TemplateDeltaReviewModal
          open={templateDeltaModalOpen}
          onClose={() => setTemplateDeltaModalOpen(false)}
          projectId={projectId}
          canResolve={canWrite}
          onResolved={() => void refreshProject()}
        />
      ) : null}
    </>
  );
}

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="p-6">
        <EmptyState
          title="Project not found"
          description="Open a project to continue."
        />
      </div>
    );
  }

  return (
    <ProjectPageContextProvider>
      <div className="flex h-full flex-col">
        <ProjectLayoutChrome />
      </div>
    </ProjectPageContextProvider>
  );
}
