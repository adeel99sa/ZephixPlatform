import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-10 text-center">
      <h3 className="text-base font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
