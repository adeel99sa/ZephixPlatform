import { useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { request } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";
import { useUIStore } from "@/stores/uiStore";

type PrefsTheme = {
  theme?: string;
};

function normalizeTheme(raw: string | undefined): "light" | "dark" | "system" {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "light";
}

/**
 * Single place that maps **saved preferences → Zustand + `html.dark`**.
 *
 * Logged-in users: `GET /users/me/preferences` is the source of truth (defaults to light if missing).
 * While that request is in flight, we clear `html.dark` so a stale persisted "dark" from localStorage
 * cannot paint dark surfaces when the user chose Light.
 *
 * Logged-out users: persisted `uiStore.theme` drives the document.
 */
export function UserThemeSync(): null {
  const { user, isLoading } = useAuth();
  const setTheme = useUIStore((s) => s.setTheme);
  const storeTheme = useUIStore((s) => s.theme);

  const prefsQuery = useQuery({
    queryKey: ["users", "me-preferences"],
    queryFn: () => request.get<PrefsTheme>("/users/me/preferences"),
    enabled: Boolean(user) && !isLoading,
    staleTime: 60_000,
  });

  /** Apply persisted theme for signed-out sessions (after localStorage rehydrate). */
  useLayoutEffect(() => {
    if (isLoading) return;
    if (user) return;
    setTheme(useUIStore.getState().theme);
  }, [user, isLoading, setTheme]);

  /** Signed-in: preferences API wins; pending fetch must not leave stale `dark` on &lt;html&gt;. */
  useLayoutEffect(() => {
    if (isLoading || !user) return;

    if (prefsQuery.status === "pending") {
      document.documentElement.classList.remove("dark");
      return;
    }

    if (prefsQuery.status === "error") {
      setTheme("light");
      return;
    }

    if (prefsQuery.status === "success") {
      setTheme(normalizeTheme(prefsQuery.data?.theme));
    }
  }, [user, isLoading, prefsQuery.status, prefsQuery.data?.theme, setTheme]);

  useLayoutEffect(() => {
    if (storeTheme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => {
      setTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [storeTheme, setTheme]);

  return null;
}
