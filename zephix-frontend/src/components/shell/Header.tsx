import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/command/CommandPalette';
import { UserProfileDropdown } from './UserProfileDropdown';
import { track } from '@/lib/telemetry';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { Bell } from 'lucide-react';

export function Header() {
  const [cmdkMounted, setCmdkMounted] = useState(false);
  const { unreadCount } = useUnreadNotifications();
  const nav = useNavigate();

  useEffect(() => setCmdkMounted(true), []);

  const openCmdK = () => {
    const ke = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(ke);
    track('ui.menu.open', { surface: 'cmdk' });
  };

  return (
    <header
      data-testid="app-header"
      className="relative z-50 h-14 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm flex items-center gap-4 px-4 lg:px-6"
    >
      <div className="flex-1" />

      {/* Center: search trigger */}
      <button
        data-testid="cmdk-button"
        aria-label="Open Command Palette"
        onClick={openCmdK}
        className="hidden w-full max-w-xl md:flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm hover:border-slate-300 hover:shadow transition"
      >
        <span className="text-slate-400">&#x2315;</span>
        <span className="flex-1 text-left">Search workspaces, projects, tasks, dashboards</span>
        <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-400">
          &#x2318;K
        </kbd>
      </button>

      {/* Mobile: compact search button */}
      <button
        data-testid="cmdk-button-mobile"
        aria-label="Open Command Palette"
        onClick={openCmdK}
        className="md:hidden rounded-lg p-2 hover:bg-slate-100"
      >
        <span className="text-sm text-slate-500">&#x2318;K</span>
      </button>

      <div className="flex flex-1 items-center justify-end gap-3">
        {/* Notification bell */}
        <button
          data-testid="header-notifications"
          aria-label="Notifications"
          onClick={() => nav('/inbox')}
          className="relative rounded-lg p-2 hover:bg-slate-100 transition"
        >
          <Bell className="h-5 w-5 text-slate-500" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        {/* Profile avatar — no divider, avatar-only per locked spec */}
        <UserProfileDropdown align="right" />
      </div>

      {cmdkMounted && <CommandPalette />}
    </header>
  );
}
