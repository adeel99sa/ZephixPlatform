import { request } from '@/lib/api';
import { useUIStore } from '@/stores/uiStore';

export type ThemePreference = 'light' | 'dark' | 'system';

export const USER_PREFS_QUERY_KEY = ['users', 'me-preferences'] as const;

export function normalizeTheme(raw: string | undefined): ThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'light';
}

export function themePreferenceLabel(theme: ThemePreference): string {
  if (theme === 'system') return 'Auto';
  if (theme === 'dark') return 'Dark';
  return 'Light';
}

/** Persist theme via server preferences — sole write path for signed-in users. */
export async function patchUserTheme(theme: ThemePreference): Promise<{ theme: string }> {
  return request.patch<{ theme: string }>('/users/me/preferences', { theme });
}

export function applyThemePreference(theme: ThemePreference): void {
  useUIStore.getState().setTheme(theme);
}
