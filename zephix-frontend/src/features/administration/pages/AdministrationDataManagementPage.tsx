import { useCallback, useEffect, useState } from "react";
import {
  administrationApi,
  type DataManagementExports,
  type DataManagementRetention,
  type DataManagementSummary,
} from "@/features/administration/api/administration.api";
import { PageHeader } from "@/ui/components/PageHeader";
import { LoadingState } from "@/ui/components/LoadingState";
import { ErrorState } from "@/ui/components/ErrorState";
import { EmptyState } from "@/ui/components/EmptyState";

type DataManagementPageState = {
  summary: DataManagementSummary | null;
  exports: DataManagementExports | null;
  retention: DataManagementRetention | null;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[idx]}`;
}

export default function AdministrationDataManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<DataManagementPageState>({
    summary: null,
    exports: null,
    retention: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, exportsData, retention] = await Promise.all([
        administrationApi.getDataManagementSummary(),
        administrationApi.getDataManagementExports(),
        administrationApi.getDataManagementRetention(),
      ]);
      setState({ summary, exports: exportsData, retention });
    } catch {
      setError("Failed to load data management governance details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState message="Loading data management governance..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Data management unavailable"
        description={error}
        onRetry={load}
      />
    );
  }

  const summary = state.summary;
  const exportsData = state.exports;
  const retention = state.retention;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Management"
        subtitle="Organization-level visibility for retention, storage posture, export governance, and residency."
      />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-900">Governance mode</p>
        <p className="mt-1 text-sm text-gray-600">
          Read-only in this phase. Destructive data controls are intentionally not exposed in
          Administration UI.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Used storage"
          value={formatBytes(summary?.storage.usedBytes ?? 0)}
        />
        <MetricCard
          label="Effective storage"
          value={formatBytes(summary?.storage.effectiveBytes ?? 0)}
        />
        <MetricCard
          label="Retention policy"
          value={
            retention?.attachmentRetentionDays === null
              ? "No expiry"
              : `${retention?.attachmentRetentionDays ?? "N/A"} days`
          }
        />
        <MetricCard label="Data region" value={summary?.residency.dataRegion || "Unspecified"} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Retention policy</h2>
        <p className="mt-1 text-sm text-gray-600">
          Attachment retention source:{" "}
          <span className="font-medium">{retention?.policySource || "unknown"}</span>. Policy edits
          are not enabled in this phase.
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Export governance</h2>
        {exportsData && exportsData.items.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            {exportsData.items.map((item, index) => (
              <li key={item.id || String(index)} className="rounded border border-gray-200 p-2">
                {item.type || "export"} - {item.status || "unknown"}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No admin export jobs configured"
            description={exportsData?.reason || "No export governance jobs are currently available."}
            className="mt-3"
          />
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Cleanup capability</h2>
        <p className="mt-1 text-sm text-gray-600">{summary?.cleanup.reason || "Read-only mode."}</p>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
