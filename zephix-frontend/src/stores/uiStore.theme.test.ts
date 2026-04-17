import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUIStore } from "./uiStore";

describe("useUIStore#setTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    useUIStore.setState({ theme: "light" });
    useUIStore.getState().setTheme("light");
  });

  it("adds html.dark when theme is dark", () => {
    useUIStore.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("removes html.dark when theme is light", () => {
    useUIStore.getState().setTheme("dark");
    useUIStore.getState().setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("applies dark class for system theme when prefers-color-scheme is dark", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );
    useUIStore.getState().setTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
