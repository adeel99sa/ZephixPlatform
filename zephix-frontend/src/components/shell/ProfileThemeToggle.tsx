import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Sun } from 'lucide-react';

import {
  applyThemePreference,
  patchUserTheme,
  type ThemePreference,
  USER_PREFS_QUERY_KEY,
} from '@/features/preferences/themePreferences';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
];

export function ProfileThemeToggle() {
  const activeTheme = useUIStore((s) => s.theme);
  const queryClient = useQueryClient();

  const saveTheme = useMutation({
    mutationFn: patchUserTheme,
    onSuccess: (_data, theme) => {
      applyThemePreference(theme);
      void queryClient.invalidateQueries({ queryKey: USER_PREFS_QUERY_KEY });
    },
  });

  const selectTheme = (theme: ThemePreference) => {
    if (theme === activeTheme || saveTheme.isPending) return;
    saveTheme.mutate(theme);
  };

  return (
    <div
      className="border-b border-slate-200 px-4 py-3 dark:border-slate-700"
      data-testid="profile-theme-toggle"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Theme
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-800/80">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = activeTheme === value;
          const testIdSuffix = value === 'system' ? 'auto' : value;
          return (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              disabled={saveTheme.isPending}
              data-testid={`profile-theme-${testIdSuffix}`}
              onClick={() => selectTheme(value)}
              className={cn(
                'inline-flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium transition',
                selected
                  ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
