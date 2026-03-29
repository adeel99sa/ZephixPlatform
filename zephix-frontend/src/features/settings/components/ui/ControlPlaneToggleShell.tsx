import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Surfaces toggles on Control Plane pages with clearer weight than personal preferences.
 */
export function ControlPlaneToggleShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex min-h-[44px] min-w-[3.5rem] items-center justify-end rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-2.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center [&_label]:min-h-[24px] [&_label]:min-w-[44px]">
        {children}
      </div>
    </div>
  );
}
