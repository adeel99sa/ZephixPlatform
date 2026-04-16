function clearInlineUserSelect(el: HTMLElement): void {
  el.style.removeProperty("user-select");
  el.style.removeProperty("-webkit-user-select");
  el.style.removeProperty("-moz-user-select");
  el.style.removeProperty("-ms-user-select");
}

/**
 * hello-pangea / react-beautiful-dnd injects `<style data-rfd-dynamic>` whose
 * "dragging" payload includes `body { user-select: none; ... }`. If a drag is
 * interrupted, that rule can persist in the stylesheet (inline body cleanup is not enough).
 */
function stripStaleRfdBodyUserSelectRule(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLStyleElement>("style[data-rfd-dynamic]").forEach((style) => {
    const t = style.textContent ?? "";
    if (!t.includes("body") || !/user-select:\s*none/i.test(t)) return;
    const cleaned = t.replace(/body\s*\{[^}]*\}/g, "").trim();
    if (cleaned !== t) {
      style.textContent = cleaned;
    }
  });
}

function computedUserSelectNone(el: HTMLElement): boolean {
  const computed = window.getComputedStyle(el);
  const raw = (computed as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect;
  return computed.userSelect === "none" || raw === "none";
}

function ensureTextSelectable(el: HTMLElement | null): void {
  if (!el) return;
  clearInlineUserSelect(el);
  if (typeof window === "undefined") return;
  if (computedUserSelectNone(el)) {
    el.style.setProperty("user-select", "text", "important");
    el.style.setProperty("-webkit-user-select", "text", "important");
  }
}

/**
 * Defensive cleanup for stale global text-selection locks.
 *
 * Drag libraries can temporarily apply `user-select: none` to `<body>` (via injected CSS).
 * If a drag is interrupted, that lock may persist and break copy/select throughout the app.
 */
export function clearUserSelectLock(): void {
  if (typeof document === "undefined") return;

  stripStaleRfdBodyUserSelectRule();

  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById("root");

  ensureTextSelectable(html);
  ensureTextSelectable(body);
  ensureTextSelectable(root);
}
