import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopCommandBar } from "./TopCommandBar";
import { Sidebar } from "./Sidebar";
import { InboxDrawer } from "./InboxDrawer";
import { AiAssistantPanel } from "@/components/shell/AiAssistantPanel";
import { ProjectTemplateCenterModal } from "@/features/templates/components/ProjectTemplateCenterModal";
import { useTemplateCenterModalStore } from "@/state/templateCenterModal.store";
import { useWorkspaceStore } from "@/state/workspace.store";
import { projectKeys } from "@/features/projects/hooks";

type AppShellProps = {
  children: React.ReactNode;
  banner?: React.ReactNode;
  showRightPanel?: boolean;
};

// ── Inbox drawer context ──
// Allows any component (Sidebar, TopBar, etc.) to toggle the inbox drawer.
type InboxDrawerContextValue = {
  inboxOpen: boolean;
  toggleInbox: () => void;
  openInbox: () => void;
  closeInbox: () => void;
};

const InboxDrawerContext = createContext<InboxDrawerContextValue>({
  inboxOpen: false,
  toggleInbox: () => {},
  openInbox: () => {},
  closeInbox: () => {},
});

export function useInboxDrawer() {
  return useContext(InboxDrawerContext);
}

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 380;
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

export function AppShell({
  children,
  banner,
  showRightPanel = true,
}: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const templateCenterOpen = useTemplateCenterModalStore((s) => s.open);
  const templateCenterWorkspaceId = useTemplateCenterModalStore(
    (s) => s.initialWorkspaceId,
  );
  const closeTemplateCenter = useTemplateCenterModalStore(
    (s) => s.closeTemplateCenter,
  );

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxPinned, setInboxPinned] = useState(false);

  const toggleInbox = useCallback(() => setInboxOpen((v) => !v), []);
  const openInbox = useCallback(() => setInboxOpen(true), []);
  const closeInbox = useCallback(() => {
    setInboxOpen(false);
    setInboxPinned(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (event: MouseEvent) => {
      const width = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, event.clientX),
      );
      setSidebarWidth(width);
      if (collapsed && width > SIDEBAR_COLLAPSED_WIDTH) {
        setCollapsed(false);
      }
    };
    const onMouseUp = () => setIsResizing(false);
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, collapsed]);

  return (
    <InboxDrawerContext.Provider
      value={{ inboxOpen, toggleInbox, openInbox, closeInbox }}
    >
      <div className="flex h-screen bg-[var(--zs-color-surface)]">
        {/* Sidebar rail — owns its own collapse/expand controls */}
        <div
          className="relative shrink-0 transition-[width] duration-200"
          style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth }}
        >
          <Sidebar
            collapsed={collapsed}
            onCollapse={() => setCollapsed(true)}
            onExpand={() => setCollapsed(false)}
          />

          {/* Resize handle — only when expanded */}
          {!collapsed ? (
            <button
              type="button"
              onMouseDown={() => setIsResizing(true)}
              onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-[#2F6FED]/25"
              aria-label="Resize sidebar"
              title="Drag to resize. Double-click to reset."
            />
          ) : null}
        </div>

        {/* Content area — top bar + page body */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopCommandBar />
          {banner}
          <div className="relative min-h-0 flex-1">
            <main
              className="absolute inset-0 overflow-auto bg-[var(--zs-color-surface)]"
              data-testid="main-content"
            >
              {children}
            </main>

            {/* Inbox drawer — overlays from the right edge of the content area */}
            <InboxDrawer
              open={inboxOpen}
              onClose={closeInbox}
              pinned={inboxPinned}
              onPinChange={setInboxPinned}
            />
          </div>
        </div>
        {showRightPanel ? <AiAssistantPanel /> : null}
        <div id="modal-root" />

        <ProjectTemplateCenterModal
          open={templateCenterOpen}
          initialWorkspaceId={templateCenterWorkspaceId}
          onClose={closeTemplateCenter}
          onSuccess={({ projectId, workspaceId: ws }) => {
            closeTemplateCenter();
            void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
            if (ws) {
              setActiveWorkspace(ws, null);
            }
            window.dispatchEvent(
              new CustomEvent("project:created", {
                detail: { projectId, workspaceId: ws },
              }),
            );
            navigate(`/projects/${projectId}`);
          }}
        />
      </div>
    </InboxDrawerContext.Provider>
  );
}
