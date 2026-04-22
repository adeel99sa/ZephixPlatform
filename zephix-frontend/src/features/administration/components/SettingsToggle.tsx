import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

/**
 * Pill toggle for admin settings (replaces bare checkboxes). Uses neutral “on” state for control-plane UI.
 */
export function SettingsToggle({
  id,
  checked,
  disabled,
  onCheckedChange,
  "aria-label": ariaLabel,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
  "aria-label"?: string;
}): ReactElement {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative inline-flex cursor-pointer items-center",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-start rounded-full bg-neutral-200 p-0.5 transition-colors",
          "peer-checked:justify-end peer-checked:bg-neutral-900",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-2",
        )}
      >
        <span className="pointer-events-none h-5 w-5 shrink-0 rounded-full bg-white shadow" />
      </span>
    </label>
  );
}
