import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";

import { SettingsSidebar } from "../components/SettingsSidebar";

/**
 * Full-page settings shell (org / workspace control plane). Replaces the main app chrome for `/settings/*`.
 */
export default function SettingsLayout(): ReactElement {
  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-white md:flex-row"
      data-settings-layout
    >
      <aside className="flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-y-auto border-b border-slate-200 bg-[#F7F8FA] md:h-full md:max-h-none md:w-[260px] md:border-b-0 md:border-r">
        <SettingsSidebar />
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div
          className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950 sm:px-10"
          role="status"
          data-settings-preview-banner
        >
          <p className="font-semibold text-amber-950">Preview only</p>
          <p className="mt-1 text-amber-900/95">
            Local changes only. Org settings on this path are not yet connected to backend
            persistence from this screen.
          </p>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10 sm:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
