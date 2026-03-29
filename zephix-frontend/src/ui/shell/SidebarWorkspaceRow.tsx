import type { ReactNode } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderPlus,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { useState, type MouseEvent } from "react";

import { AnchoredMenu, type AnchoredMenuItem } from "./AnchoredMenu";
import { PortalTooltip } from "./PortalTooltip";

export type WorkspaceMenuAction =
  | "favorite"
  | "rename"
  | "copy-link"
  | "create-folder"
  | "create-dashboard"
  | "create-template"
  | "browse-templates"
  | "save-as-template"
  | "update-template"
  | "duplicate"
  | "archive"
  | "delete"
  | "sharing";

type SidebarWorkspaceRowProps = {
  name: string;
  workspaceId: string;
  active?: boolean;
  expanded?: boolean;
  indentClassName?: string;
  isFavorite?: boolean;
  /** Navigate to workspace (e.g. dashboard) — workspace name / label */
  onLabelClick: () => void;
  /** Expand or collapse nested tree — chevron only; must not navigate */
  onToggleExpand: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Called when a menu action is triggered */
  onMenuAction?: (action: WorkspaceMenuAction) => void;
  /** Hide menu items based on permissions */
  hiddenActions?: WorkspaceMenuAction[];
  /** Nested rows (e.g. projects) shown when expanded */
  children?: ReactNode;
};

export function SidebarWorkspaceRow({
  name,
  workspaceId,
  active,
  expanded = false,
  indentClassName = "",
  isFavorite = false,
  onLabelClick,
  onToggleExpand,
  onMenuAction,
  hiddenActions = [],
  children,
}: SidebarWorkspaceRowProps) {
  // Only one menu open at a time within this row
  const [openMenu, setOpenMenu] = useState<"plus" | "more" | null>(null);

  const isHidden = (id: WorkspaceMenuAction) => hiddenActions.includes(id);

  const moreMenuItems: AnchoredMenuItem[] = [
    // ── Top section: Favorite, Rename, Copy Link ──
    {
      id: "favorite",
      label: isFavorite ? "Unfavorite" : "Favorite",
      icon: Star,
      hidden: isHidden("favorite"),
      onClick: () => onMenuAction?.("favorite"),
    },
    {
      id: "rename",
      label: "Rename",
      icon: Pencil,
      hidden: isHidden("rename"),
      onClick: () => onMenuAction?.("rename"),
    },
    {
      id: "copy-link",
      label: "Copy link",
      icon: Link2,
      hidden: isHidden("copy-link"),
      onClick: () => onMenuAction?.("copy-link"),
    },

    // ── Management only: creation lives in the + menu ──
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      divider: true,
      hidden: isHidden("duplicate"),
      onClick: () => onMenuAction?.("duplicate"),
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      hidden: isHidden("archive"),
      onClick: () => onMenuAction?.("archive"),
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      danger: true,
      hidden: isHidden("delete"),
      onClick: () => onMenuAction?.("delete"),
    },
  ];

  // Sharing & Permissions footer button
  const sharingFooter = !isHidden("sharing") ? (
    <button
      type="button"
      onClick={() => onMenuAction?.("sharing")}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 mx-auto my-1 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      style={{ width: "calc(100% - 12px)", marginLeft: 6, marginRight: 6 }}
    >
      <Share2 className="h-3.5 w-3.5" />
      Sharing & Permissions
    </button>
  ) : null;

  // + menu items (quick create)
  const plusMenuItems: AnchoredMenuItem[] = [
    {
      id: "create-folder",
      label: "New Project",
      icon: FolderPlus,
      hidden: isHidden("create-folder"),
      onClick: () => onMenuAction?.("create-folder"),
    },
    {
      id: "create-dashboard",
      label: "New Dashboard",
      icon: LayoutDashboard,
      hidden: isHidden("create-dashboard"),
      onClick: () => onMenuAction?.("create-dashboard"),
    },
    {
      id: "browse-templates",
      label: "From Template",
      icon: LayoutTemplate,
      hidden: isHidden("browse-templates"),
      onClick: () => onMenuAction?.("browse-templates"),
    },
  ];

  return (
    <div className="flex flex-col" data-workspace-id={workspaceId}>
    <div className="group flex items-center gap-1">
      <div
        className={`flex min-w-0 flex-1 items-center rounded-lg px-1 py-1 text-left text-sm transition-colors ${indentClassName} ${
          active
            ? "bg-blue-50 font-semibold text-blue-700"
            : "text-slate-700"
        }`}
      >
        <button
          type="button"
          onClick={(e) => onToggleExpand(e)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse workspace projects" : "Expand workspace projects"}
          className={`mr-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
            active
              ? "text-slate-500 hover:bg-blue-100"
              : "text-slate-400 hover:bg-slate-100"
          }`}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onLabelClick}
          className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
            active ? "" : "hover:bg-slate-100"
          }`}
        >
          {name}
        </button>
      </div>

      <div className="flex w-[56px] shrink-0 items-center justify-end gap-1">
        {/* ... (more) menu */}
        <AnchoredMenu
          items={moreMenuItems}
          straddleRight
          footer={sharingFooter}
          onOpen={() => setOpenMenu("more")}
          forceClose={openMenu !== "more" && openMenu !== null}
          trigger={({ ref, onClick: toggle, open }) => (
            <PortalTooltip label="Workspace Settings">
              {({ onMouseEnter, onMouseLeave }) => (
                <button
                  ref={ref}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(e);
                  }}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  className={`flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-600 ${
                    open ? "opacity-100 bg-slate-100 text-slate-600" : "opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label="Workspace Settings"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              )}
            </PortalTooltip>
          )}
        />

        {/* + (create) menu */}
        {onMenuAction ? (
          <AnchoredMenu
            items={plusMenuItems}
            straddleRight
            onOpen={() => setOpenMenu("plus")}
            forceClose={openMenu !== "plus" && openMenu !== null}
            trigger={({ ref, onClick: toggle, open }) => (
              <PortalTooltip label="Create new">
                {({ onMouseEnter, onMouseLeave }) => (
                  <button
                    ref={ref}
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(e);
                    }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className={`flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-600 ${
                      open ? "opacity-100 bg-slate-100 text-slate-600" : "opacity-0 group-hover:opacity-100"
                    }`}
                    aria-label="Create new"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </PortalTooltip>
            )}
          />
        ) : null}
      </div>
    </div>
    {children ? (
      <div className="relative mt-0.5 w-full min-w-0">
        {/* Tree guide: faint vertical thread from chevron column into nested rows (Monday-style) */}
        <div
          className="pointer-events-none absolute left-8 top-0 z-0 h-[calc(100%-4px)] w-px bg-gradient-to-b from-slate-200/90 via-slate-200/60 to-transparent"
          aria-hidden
        />
        <div className="relative z-[1] min-w-0">{children}</div>
      </div>
    ) : null}
    </div>
  );
}
