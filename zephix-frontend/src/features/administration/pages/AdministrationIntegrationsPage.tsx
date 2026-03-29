import { useCallback, useEffect, useState } from "react";
import {
  administrationApi,
  type IntegrationsApiAccess,
  type IntegrationsGovernanceSummary,
  type IntegrationsWebhooks,
} from "@/features/administration/api/administration.api";
import { PageHeader } from "@/ui/components/PageHeader";
import { LoadingState } from "@/ui/components/LoadingState";
import { ErrorState } from "@/ui/components/ErrorState";
import { EmptyState } from "@/ui/components/EmptyState";

type IntegrationsPageState = {
  summary: IntegrationsGovernanceSummary | null;
  apiAccess: IntegrationsApiAccess | null;
  webhooks: IntegrationsWebhooks | null;
};

export default function AdministrationIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<IntegrationsPageState>({
    summary: null,
    apiAccess: null,
    webhooks: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, apiAccess, webhooks] = await Promise.all([
        administrationApi.getIntegrationsSummary(),
        administrationApi.getIntegrationsApiAccess(),
        administrationApi.getIntegrationsWebhooks(),
      ]);
      setState({ summary, apiAccess, webhooks });
    } catch {
      setError("Failed to load integrations governance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [load]);

  if (loading) {
    return <LoadingState message="Loading integrations governance..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Integrations governance unavailable"
        description={error}
        onRetry={load}
      />
    );
  }

  const summary = state.summary;
  const apiAccess = state.apiAccess;
  const webhooks = state.webhooks;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Organization-level visibility for API access, connected integrations, and webhook governance."
      />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-900">Governance mode</p>
        <p className="mt-1 text-sm text-gray-600">
          Read-only control plane for this phase.{" "}
          {summary?.editableControls.reason || "Admin mutation controls are deferred."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Total connections"
          value={summary?.totals.totalConnections ?? 0}
        />
        <MetricCard
          label="Enabled connections"
          value={summary?.totals.enabledConnections ?? 0}
        />
        <MetricCard
          label="Webhook enabled"
          value={summary?.totals.webhookEnabledConnections ?? 0}
        />
        <MetricCard
          label="Errored"
          value={summary?.totals.erroredConnections ?? 0}
        />
        <MetricCard
          label="Providers"
          value={summary?.totals.providerCount ?? 0}
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Connected apps and API access</h2>
        </div>
        {apiAccess && apiAccess.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Auth</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Last sync</th>
                </tr>
              </thead>
              <tbody>
                {apiAccess.items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 text-gray-700">
                    <td className="px-4 py-3">{item.provider.toUpperCase()}</td>
                    <td className="px-4 py-3">{item.authType}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3">{item.baseUrl}</td>
                    <td className="px-4 py-3">{item.lastSyncRunAt || "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No integrations connected"
            description="No organization integration connections are currently configured."
            className="m-4"
          />
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Webhook governance</h2>
        </div>
        {webhooks && webhooks.items.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {webhooks.items.map((item) => (
              <li key={item.connectionId} className="px-4 py-3 text-sm text-gray-700">
                <p className="font-medium text-gray-900">
                  {item.provider.toUpperCase()} webhook
                </p>
                <p className="mt-1">Destination: {item.destination}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Status: {item.status} - Updated: {item.updatedAt || "Unknown"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No webhook routes enabled"
            description="Webhook configuration remains visible here once enabled in source-backed integration settings."
            className="m-4"
          />
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Provider coverage</p>
        <p className="mt-1 text-sm text-gray-600">
          {summary?.providers.length
            ? summary.providers.join(", ")
            : "No providers are currently configured for this organization."}
        </p>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
