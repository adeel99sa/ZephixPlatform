/**
 * AssigneePicker — unified assignee selection component.
 *
 * Single reusable component for all views: WaterfallTable, TaskListSection,
 * ProjectBoardTab, TaskDetailPanel.
 *
 * Behavior:
 * - One click opens popup immediately (no intermediate state)
 * - Search box at top filters members
 * - "Me" quick-assign option (current user)
 * - Project team members from GET /projects/:id/team
 * - "Invite member" at bottom — adds existing platform users only
 * - Keyboard: Arrow keys navigate, Enter selects, Escape closes
 * - Click outside closes
 *
 * Data source: project team → workspace members fallback.
 * Multi-assignee ready: component accepts onSelect(userId) but the
 * architecture supports extending to onSelect(userIds[]) when backend adds it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { GradientAvatar } from '@/components/ui/GradientAvatar';

/* ── Types ──────────────────────────────────────────────────── */

export interface AssigneeOption {
  id: string;
  name: string;
  email?: string;
  /** True if this is the current user */
  isMe?: boolean;
}

export interface AssigneePickerProps {
  /** Currently assigned user ID (null = unassigned) */
  value: string | null;
  /** Available assignee options (project team or workspace members) */
  options: AssigneeOption[];
  /** Current user ID — shows "Me" badge */
  currentUserId?: string | null;
  /** Called when user picks an assignee (empty string = unassign) */
  onSelect: (userId: string | null) => void;
  /** Called when picker should close */
  onClose: () => void;
  /** Called when user clicks "Invite member" */
  onInvite?: () => void;
  /** Position anchor — absolute positioning relative to parent */
  className?: string;
}

/* ── Component ──────────────────────────────────────────────── */

export function AssigneePicker({
  value,
  options,
  currentUserId,
  onSelect,
  onClose,
  onInvite,
  className = '',
}: AssigneePickerProps) {
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click outside closes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Build filtered list with "Me" at top
  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = options.map((o) => ({
      ...o,
      isMe: o.id === currentUserId,
    }));

    if (q) {
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.email && o.email.toLowerCase().includes(q)),
      );
    }

    // Sort: "Me" first, then alphabetical
    list.sort((a, b) => {
      if (a.isMe && !b.isMe) return -1;
      if (!a.isMe && b.isMe) return 1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [options, search, currentUserId]);

  // Unassign option
  const allItems = useMemo(() => {
    const items: Array<{ type: 'unassign' } | { type: 'member'; option: AssigneeOption & { isMe?: boolean } }> = [];
    if (value) {
      items.push({ type: 'unassign' });
    }
    for (const o of filteredOptions) {
      items.push({ type: 'member', option: o });
    }
    return items;
  }, [filteredOptions, value]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [search]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = allItems[focusedIndex];
        if (item) {
          if (item.type === 'unassign') {
            onSelect(null);
          } else {
            onSelect(item.option.id);
          }
          onClose();
        }
      }
    },
    [allItems, focusedIndex, onSelect, onClose],
  );

  return (
    <div
      ref={panelRef}
      className={`absolute z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 ${className}`}
      role="listbox"
      aria-label="Select assignee"
    >
      {/* Search */}
      <div className="border-b border-slate-100 p-2 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search members..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Options */}
      <div className="max-h-48 overflow-y-auto py-1">
        {/* Unassign option */}
        {value && (
          <button
            type="button"
            role="option"
            aria-selected={false}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
              focusedIndex === 0
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            onClick={() => {
              onSelect(null);
              onClose();
            }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400 dark:bg-slate-700">
              —
            </div>
            <span>Unassign</span>
          </button>
        )}

        {/* People header */}
        {filteredOptions.length > 0 && (
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            People
          </div>
        )}

        {/* Member list */}
        {filteredOptions.map((option, idx) => {
          const itemIndex = value ? idx + 1 : idx;
          const selected = option.id === value;
          const focused = focusedIndex === itemIndex;

          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                focused
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                  : selected
                    ? 'bg-slate-50 dark:bg-slate-800'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => {
                onSelect(option.id);
                onClose();
              }}
            >
              <GradientAvatar name={option.name} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{option.name}</span>
                  {option.isMe && (
                    <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Me
                    </span>
                  )}
                </div>
                {option.email && (
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {option.email}
                  </p>
                )}
              </div>
              {selected && (
                <span className="shrink-0 text-blue-500">✓</span>
              )}
            </button>
          );
        })}

        {/* Empty state */}
        {filteredOptions.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            {search ? 'No members match your search' : 'No team members yet'}
          </p>
        )}
      </div>

      {/* Invite member */}
      {onInvite && (
        <div className="border-t border-slate-100 p-1 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onInvite();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4 text-slate-400" />
            <span>Invite member</span>
          </button>
        </div>
      )}
    </div>
  );
}
