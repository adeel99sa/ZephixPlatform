import { useEffect, useState } from "react";

import {
  administrationApi,
  type RbacMigrationSummary,
} from "@/features/administration/api/administration.api";

const DISMISS_KEY = "zephix.rbacMigrationSummary.dismissed";
const CLIENT_ANCHOR_KEY = "zephix.rbacMigrationSummary.clientAnchorAt";

const AUTO_HIDE_DAYS = 7;

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function resolveAnchor(summary: RbacMigrationSummary): string | null {
  if (summary.generatedAt) return summary.generatedAt;
  let anchor = storageGet(CLIENT_ANCHOR_KEY);
  if (!anchor) {
    storageSet(CLIENT_ANCHOR_KEY, new Date().toISOString());
    anchor = storageGet(CLIENT_ANCHOR_KEY);
  }
  return anchor;
}

function tooOld(summary: RbacMigrationSummary): boolean {
  const anchor = resolveAnchor(summary);
  if (!anchor) return false;
  const t = Date.parse(anchor);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > AUTO_HIDE_DAYS * 86400000;
}

/**
 * Staging verification tile for RBAC migration outcomes (Stream A).
 * Hidden after explicit dismiss or when older than {@link AUTO_HIDE_DAYS}.
 */
export function RbacMigrationSummaryTile() {
  const [summary, setSummary] = useState<RbacMigrationSummary | null | undefined>(undefined);
  const [dismissed, setDismissed] = useState(() => storageGet(DISMISS_KEY) === "1");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await administrationApi.getRbacMigrationSummary();
      if (!cancelled) setSummary(res);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (summary === undefined) return null;
  if (!summary) return null;
  if (dismissed) return null;
  if (tooOld(summary)) return null;

  return (
    <section
      className="rounded-lg border border-indigo-100 bg-indigo-50/80 p-4"
      aria-labelledby="rbac-migration-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="rbac-migration-heading" className="text-sm font-semibold text-indigo-950">
            RBAC migration summary (staging verification)
          </h2>
          <p className="mt-1 text-xs text-indigo-900/80">
            Read-only outcomes from the role-model migration. Auto-hides after {AUTO_HIDE_DAYS} days from the
            summary timestamp or when dismissed.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-indigo-800 underline-offset-2 hover:underline"
          onClick={() => {
            storageSet(DISMISS_KEY, "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
      <dl className="mt-4 grid gap-3 text-sm text-indigo-950 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-indigo-800/80">Users migrated</dt>
          <dd className="mt-1 text-lg font-semibold">{summary.migratedUserCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-indigo-800/80">
            PM → Member vs Owner exceptions
          </dt>
          <dd className="mt-1 text-lg font-semibold">{summary.pmMappingExceptions.length}</dd>
        </div>
      </dl>
      {summary.pmMappingExceptions.length > 0 ? (
        <div className="mt-4 max-h-48 overflow-auto rounded border border-indigo-100 bg-white text-xs text-gray-800">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Resolution</th>
                <th className="px-2 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {summary.pmMappingExceptions.map((row) => (
                <tr key={`${row.email}-${row.resolution}`} className="border-t border-gray-100">
                  <td className="px-2 py-2">{row.email}</td>
                  <td className="px-2 py-2">{row.resolution}</td>
                  <td className="px-2 py-2 text-gray-600">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-xs text-indigo-900/80">No PO Rule #4 exceptions recorded.</p>
      )}
    </section>
  );
}
