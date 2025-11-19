import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/telemetry';
import { registerWorkspaceSettingsAction } from '@/features/workspaces/WorkspaceSettingsAction';

type Command = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

const MODAL_ROOT_ID = 'modal-root';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    track('ui.menu.close', { surface: 'cmdk' });
  }, []);

  const openCmd = useCallback(() => {
    setOpen(true);
    track('ui.cmdk.open');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Global hotkey: Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && k === 'k') {
        e.preventDefault();
        if (open) close(); else openCmd();
      }
      if (open && k === 'escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, openCmd]);

  // Commands (role-gated could be added via props/context)
  const [commands, setCommands] = useState<Command[]>([
    { id: 'dashboards', label: 'Go to Dashboards', hint: '/dashboards', run: () => navigate('/dashboards') },
    { id: 'create-dashboard', label: 'Create Dashboard', hint: 'modal', run: () => {
        track('ui.dashboard.create.open', { source: 'cmdk' });
        navigate('/dashboards'); // open page, modal opens via route state in Index
        setTimeout(() => {
          const btn = document.querySelector('[data-testid="create-dashboard-button"]') as HTMLButtonElement | null;
          btn?.click();
        }, 0);
      }
    },
    { id: 'invite', label: 'Invite Members', hint: 'modal', run: () => {
        const btn = document.querySelector('[data-testid="invite-members-menu-item"]') as HTMLButtonElement | null;
        btn?.click();
      }
    },
    { id: 'admin', label: 'Open Administration', hint: '/admin', run: () => navigate('/admin') },
    { id: 'home', label: 'Go to Home', hint: '/home', run: () => navigate('/home') },
  ]);

  // Register workspace settings action dynamically
  useEffect(() => {
    const commandRegistry = {
      register: (id: string, label: string, run: () => void) => {
        setCommands(prev => {
          const exists = prev.find(c => c.id === id);
          if (exists) return prev;
          return [...prev, { id, label, hint: 'modal', run }];
        });
      }
    };
    registerWorkspaceSettingsAction(commandRegistry);
  }, []);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const onExecute = (cmd: Command) => {
    track('ui.cmdk.execute', { id: cmd.id, label: cmd.label });
    cmd.run();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
      listRef.current?.children[activeIndex + 1]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      listRef.current?.children[activeIndex - 1]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onExecute(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  const modalRoot = document.getElementById(MODAL_ROOT_ID) || document.body;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Command Palette"
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/30 p-8"
      data-testid="cmdk-dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-xl rounded-lg bg-white p-2 shadow-xl outline-none dark:bg-neutral-900">
        <div className="flex items-center gap-2 border-b border-neutral-200 p-2 dark:border-neutral-800">
          <span className="text-xs text-neutral-500">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Type a command…"
            aria-label="Search commands"
            className="w-full bg-transparent p-2 outline-none"
            data-testid="cmdk-input"
          />
        </div>
        <ul
          ref={listRef}
          role="menu"
          aria-label="Command results"
          className="max-h-80 overflow-auto p-2"
          data-testid="cmdk-results"
        >
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              role="menuitem"
              tabIndex={-1}
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => onExecute(cmd)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 ${
                i === activeIndex ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
              }`}
              data-testid={cmd.id === 'workspace.settings' ? 'action-workspace-settings' : `cmdk-item-${cmd.id}`}
            >
              <span>{cmd.label}</span>
              {cmd.hint && <span className="text-xs text-neutral-500">{cmd.hint}</span>}
            </li>
          ))}
          {!filtered.length && (
            <li className="px-3 py-6 text-sm text-neutral-500" data-testid="cmdk-empty">
              No commands found
            </li>
          )}
        </ul>
      </div>
    </div>,
    modalRoot
  );
}
