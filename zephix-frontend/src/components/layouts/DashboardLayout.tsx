import { Navigate, Outlet } from "react-router-dom";
import { PanelLeft } from "lucide-react";
import { Header } from "@/components/shell/Header";
import { NavigationRecentsTracker } from "@/components/shell/NavigationRecentsTracker";
import { Sidebar } from "@/components/shell/Sidebar";
import { SidebarResizeHandle } from "@/components/shell/SidebarResizeHandle";
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceValidation } from '@/hooks/useWorkspaceValidation';
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { platformRoleFromUser } from "@/utils/roles";
import { shouldRunAdminFirstTimeOnboarding } from "@/routing/adminOnboardingPolicy";
import {
  SIDEBAR_DEFAULT_PX,
  SIDEBAR_WIDTH_STORAGE_KEY,
  useResizableSidebar,
} from "@/hooks/useResizableSidebar";
import { useUIStore } from "@/stores/uiStore";

/**
 * DashboardLayout — always renders the app shell (Sidebar + Header).
 *
 * LOCKED SHELL CONTRACT (gating: DashboardLayout.sidebarResize + SidebarResizeHandle):
 *   - Left sidebar width is user-resizable via SidebarResizeHandle (drag, double-click reset).
 *   - Hover tooltip: Close ⌘\, Resize Drag, Reset Double-click (ClickUp parity).
 *   - Width persisted in localStorage (`zephix-sidebar-width-px`). Do not revert to fixed w-72.
 *
 * Workspace gating is handled at the route level by <RequireWorkspace />.
 *
 * GATE 1 — Redirect to `/onboarding` **only** when `shouldRunAdminFirstTimeOnboarding` is true:
 * Admin + (`not_started` | `in_progress`). Never for completed, dismissed, Member, or Viewer.
 * Waits until org onboarding status has loaded (`!orgHomeLoading`) so we do not redirect on `undefined`.
 *
 * GATE 2 — Workspace validation (validates persisted ID when a workspace is selected).
 */
export default function DashboardLayout() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { isLoading: orgHomeLoading, onboardingStatus } = useOrgHomeState();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const { listPx: sidebarPx, setListPx: setSidebarPx, splitRef, onResizerPointerDown, isDragging } =
    useResizableSidebar();

  const resetSidebarWidth = () => {
    setSidebarPx(SIDEBAR_DEFAULT_PX);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(SIDEBAR_DEFAULT_PX));
    }
  };

  /**
   * GATE 1: Brand-new Admin with incomplete org onboarding → full-page flow.
   */
  const platformRole = platformRoleFromUser(user);
  const needsAdminOnboarding =
    Boolean(user) &&
    !orgHomeLoading &&
    shouldRunAdminFirstTimeOnboarding({ platformRole, onboardingStatus });
  const onboardingCompleteForValidation = !orgHomeLoading && !needsAdminOnboarding;

  useWorkspaceValidation({
    enabled: onboardingCompleteForValidation && Boolean(activeWorkspaceId),
  });
  if (needsAdminOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div ref={splitRef} className="relative flex h-screen bg-slate-50 dark:bg-slate-950">
      <NavigationRecentsTracker />
      {sidebarOpen ? (
        <>
          <div
            className="relative shrink-0 flex flex-col"
            style={{ width: sidebarPx }}
            data-testid="sidebar-shell"
          >
            <Sidebar />
          </div>
          <SidebarResizeHandle
            onPointerDown={onResizerPointerDown}
            onReset={resetSidebarWidth}
            onClose={() => setSidebarOpen(false)}
            isDragging={isDragging}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-[18px] z-50 hidden rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 md:inline-flex dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Show sidebar"
          title="Show sidebar"
          data-testid="sidebar-reopen-btn"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <DemoBanner email={user?.email} />
        <main className="relative z-0 min-h-0 min-w-0 flex-1 overflow-auto" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
