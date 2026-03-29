import type { ReactElement, ReactNode } from "react";

export type SettingsPageHeaderProps = {
  title: string;
  description: string;
  /** Right-aligned actions (e.g. primary CTA) on wide screens. */
  actions?: ReactNode;
};

export function SettingsPageHeader({
  title,
  description,
  actions,
}: SettingsPageHeaderProps): ReactElement {
  return (
    <header className="border-b border-slate-200 pb-6 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-slate-500">{description}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pt-0.5">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
