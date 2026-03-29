import type { ReactElement } from "react";

export type DangerZoneProps = {
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
};

export function DangerZone({
  title,
  description,
  actionText,
  onAction,
}: DangerZoneProps): ReactElement {
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50/30 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-900">{title}</p>
        <p className="mt-1 text-sm text-red-700">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        {actionText}
      </button>
    </div>
  );
}
