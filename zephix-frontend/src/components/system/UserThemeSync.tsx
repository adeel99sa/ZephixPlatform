import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { request } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";
import { useUIStore } from "@/stores/uiStore";

type PrefsTheme = {
  theme?: string;
};

/**
 * Applies the user's saved theme from the API to the document (`html.dark` + uiStore),
 * and keeps system theme in sync when the OS preference changes.
 */
export function UserThemeSync(): null {
  const { user, isLoading } = useAuth();
  const setTheme = useUIStore((s) => s.setTheme);
  const storeTheme = useUIStore((s) => s.theme);

  const prefsQuery = useQuery({
    queryKey: ["users", "me-preferences"],
    queryFn: () => request.get<PrefsTheme>("/users/me/preferences"),
    enabled: Boolean(user) && !isLoading,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setTheme(useUIStore.getState().theme);
      return;
    }
    if (!prefsQuery.isSuccess || !prefsQuery.data?.theme) return;
    const t = prefsQuery.data.theme;
    if (t === "light" || t === "dark" || t === "system") {
      setTheme(t);
    }
  }, [
    user,
    isLoading,
    prefsQuery.isSuccess,
    prefsQuery.data?.theme,
    setTheme,
  ]);

  useEffect(() => {
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
