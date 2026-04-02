import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';
import { AiToggleButton } from './AiToggleButton';
import { UserProfileDropdown } from './UserProfileDropdown';
import { track } from '@/lib/telemetry';

export function Header() {
  const [cmdkMounted, setCmdkMounted] = useState(false);

  useEffect(() => setCmdkMounted(true), []);

  const openCmdK = () => {
    // trigger CommandPalette via global hotkey (simulate)
    const ke = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(ke);
    track('ui.menu.open', { surface: 'cmdk' });
  };

  return (
    <header data-testid="app-header" className="h-12 border-b bg-white flex items-center justify-end gap-3 px-4">
      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          data-testid="cmdk-button"
          aria-label="Open Command Palette"
          className="rounded-md px-2 py-1 hover:bg-neutral-100 focus:outline-none focus:ring-2"
          onClick={openCmdK}
        >
          ⌘K
        </button>

        <AiToggleButton />
      </div>

      <div className="shrink-0 border-l border-gray-200 pl-3">
        <UserProfileDropdown align="right" />
      </div>

      {cmdkMounted && <CommandPalette />}
    </header>
  );
}
