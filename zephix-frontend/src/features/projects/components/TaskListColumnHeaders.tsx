import type { ReactElement } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export type TaskListColumnHeadersProps = {
  className?: string;
};

const headerCell =
  "text-left text-xs font-semibold uppercase tracking-wide text-slate-500";

/**
 * Column header row aligned with {@link TaskRow}.
 */
export function TaskListColumnHeaders({
  className,
}: TaskListColumnHeadersProps): ReactElement {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_96px_88px_104px_96px_32px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-3 py-2",
        className,
      )}
      role="row"
    >
      <div className={headerCell} role="columnheader">
        Name
      </div>
      <div className={cn(headerCell, "text-center")} role="columnheader">
        Assignee
      </div>
      <div className={headerCell} role="columnheader">
        Due
      </div>
      <div className={headerCell} role="columnheader">
        Status
      </div>
      <div className={headerCell} role="columnheader">
        Priority
      </div>
      <div className="flex justify-end" role="columnheader">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Add column (coming soon)"
          title="Add column (coming soon)"
          disabled
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
