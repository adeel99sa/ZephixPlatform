function clearInlineUserSelect(body: HTMLBodyElement): void {
  body.style.removeProperty("user-select");
  body.style.removeProperty("-webkit-user-select");
  body.style.removeProperty("-moz-user-select");
  body.style.removeProperty("-ms-user-select");
}

/**
 * Defensive cleanup for stale global text-selection locks.
 *
 * Drag libraries can temporarily apply `user-select: none` to `<body>`.
 * If a drag is interrupted, that lock may persist and break copy/select
 * throughout the app.
 */
export function clearUserSelectLock(): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  clearInlineUserSelect(body);

  const computed = window.getComputedStyle(body);
  if (computed.userSelect === "none") {
    // Override stale computed lock (including stylesheet/!important paths).
    body.style.setProperty("user-select", "text", "important");
    body.style.setProperty("-webkit-user-select", "text", "important");
  }
}
