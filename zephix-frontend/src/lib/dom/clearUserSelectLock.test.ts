import { afterEach, describe, expect, it } from "vitest";

import { clearUserSelectLock } from "./clearUserSelectLock";

describe("clearUserSelectLock", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("style");
  });

  it("removes stale hello-pangea body user-select rule from data-rfd-dynamic styles", () => {
    const style = document.createElement("style");
    style.setAttribute("data-rfd-dynamic", "ctx-1");
    style.textContent = `[data-rfd-drag-handle-context-id="ctx-1"] { cursor: grab; }
body {
        cursor: grabbing;
        user-select: none;
        -webkit-user-select: none;
      }`;
    document.head.appendChild(style);

    clearUserSelectLock();

    const next = style.textContent ?? "";
    expect(next).not.toMatch(/user-select:\s*none/i);
    expect(next).toContain("cursor: grab");
  });
});
