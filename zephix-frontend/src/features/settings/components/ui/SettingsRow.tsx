import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SettingsRowProps = {
  label: string;
  description: string;
  control: ReactNode;
  badge?: string;
  /** Badge palette; defaults to indigo (Enterprise). Use amber for Core / governance emphasis. */
  badgeTone?: "indigo" | "amber";
  /** Control Plane / system rules: slightly stronger label + description. */
  variant?: "default" | "system";
};

export function SettingsRow({
  label,
  description,
  control,
  badge,
  badgeTone = "indigo",
  variant = "default",
}: SettingsRowProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-slate-100 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10",
        "last:border-b-0",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm text-slate-900",
              variant === "system" ? "font-semibold tracking-tight" : "font-medium",
            )}
          >
            {label}
          </span>
          {badge ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                badgeTone === "amber"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-indigo-100 text-indigo-700",
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1.5 text-sm leading-snug",
            variant === "system" ? "text-slate-600" : "text-slate-500",
          )}
        >
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-end sm:pt-0">{control}</div>
    </div>
  );
}
