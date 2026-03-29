import type { ReactElement, ReactNode } from "react";

export type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({
  title,
  children,
}: SettingsSectionProps): ReactElement {
  return (
    <section className="flex flex-col gap-0">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}
