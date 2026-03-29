import type { ReactElement } from "react";

import { SettingsPageHeader } from "./ui/SettingsPageHeader";

export type PlaceholderPageProps = {
  /** Section title shown in the header (e.g. "Profile"). */
  title: string;
  /** Optional subtitle; defaults to a standard "Coming soon" line. */
  description?: string;
};

export function PlaceholderPage({
  title,
  description = "This section is not available yet. Configuration will connect to backend behavior when shipped.",
}: PlaceholderPageProps): ReactElement {
  return (
    <div data-settings-placeholder>
      <SettingsPageHeader title={title} description={description} />
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm font-medium text-slate-600">
        Coming soon
      </p>
    </div>
  );
}
