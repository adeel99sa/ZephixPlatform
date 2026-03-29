import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';
import { AiToggleButton } from './AiToggleButton';
import { UserProfileDropdown } from './UserProfileDropdown';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { useAuth } from '@/state/AuthContext';
import { track } from '@/lib/telemetry';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useLocation } from 'react-router-dom';

function getHeaderTitle(pathname: string, activeWorkspaceName: string | null): string {
  if (pathname === '/home') return 'Home';
  if (pathname === '/inbox') return 'Inbox';
  if (pathname === '/my-tasks') return 'My Tasks';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/projects/')) return 'Project';
  if (pathname.startsWith('/workspaces')) return activeWorkspaceName || 'Workspace';
  return activeWorkspaceName || 'Zephix';
}

export function Header() {
  const [cmdkMounted, setCmdkMounted] = useState(false);
  const { user } = useAuth();
  const activeWorkspaceName = useWorkspaceStore((state) => state.activeWorkspaceName);
  const location = useLocation();

  useEffect(() => setCmdkMounted(true), []);
  const canUseBell = ((user?.platformRole || user?.role || '').toUpperCase() !== 'VIEWER');
  // Header only renders inside ApplicationShell (DashboardLayout), never inside AdminShell.
  // Admin navigation lives in UserProfileDropdown; "Back to App" lives in AdministrationLayout.

  const openCmdK = () => {
    const ke = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(ke);
    track('ui.menu.open', { surface: 'cmdk' });
  };

  const titleLabel = getHeaderTitle(location.pathname, activeWorkspaceName);

  return (
    <header
      data-testid="app-header"
      className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4"
    >
      {/* Page title removed — sidebar provides navigation context */}
      <div />
      <div className="flex items-center gap-2">
        <button
          data-testid="cmdk-button"
          aria-label="Open Command Palette"
          className="zs-btn-secondary px-2 py-1 text-xs"
          onClick={openCmdK}
        >
          ⌘K
        </button>
        <AiToggleButton />
        {canUseBell ? <NotificationBell /> : null}
        <div className="ml-2 w-[220px]">
          <UserProfileDropdown />
        </div>
      </div>

      {cmdkMounted && <CommandPalette />}
    </header>
  );
}
