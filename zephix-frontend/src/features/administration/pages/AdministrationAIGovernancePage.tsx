import { useCallback, useEffect, useState } from "react";
import {
  administrationApi,
  type AIGovernanceSummary,
  type AIGovernanceUsage,
} from "@/features/administration/api/administration.api";
import { PageHeader } from "@/ui/components/PageHeader";
import { LoadingState } from "@/ui/components/LoadingState";
import { ErrorState } from "@/ui/components/ErrorState";
import { EmptyState } from "@/ui/components/EmptyState";

export default function AdministrationAIGovernancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AIGovernanceSummary | null>(null);
  const [usage, setUsage] = useState<AIGovernanceUsage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, usageData] = await Promise.all([
        administrationApi.getAIGovernanceSummary(),
        administrationApi.getAIGovernanceUsage(),
      ]);
      setSummary(summaryData);
      setUsage(usageData);
    } catch {
      setError("Failed to load AI governance data.");
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
    return <LoadingState message="Loading AI governance..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="AI governance unavailable"
        description={error}
        onRetry={load}
      />
    );
  }

  if (!summary) {
    return (
      <EmptyState
        title="No AI governance summary available"
        description="AI governance summary is currently unavailable for this organization."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Governance"
        subtitle="Visibility surface for AI advisory policy, role access behavior, and usage observations."
      />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Current operating model</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>AI enabled: {summary.aiEnabled ? "Yes" : "No"}</li>
          <li>Mode: {summary.advisoryOnly ? "Advisory-only" : "Not advisory-only"}</li>
          <li>Policy version: {summary.policyVersion}</li>
          <li>Training statement: {summary.dataTrainingStatement}</li>
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Role access model</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Platform role</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Visibility mode</th>
              </tr>
            </thead>
            <tbody>
              {summary.roleAccess.map((row) => (
                <tr key={row.role} className="border-t border-gray-200 text-gray-700">
                  <td className="px-4 py-3">{row.role}</td>
                  <td className="px-4 py-3">{row.aiAdvisoryAccess}</td>
                  <td className="px-4 py-3">{row.visibilityMode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">AI usage observations</h2>
        </div>
        {usage ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            <Metric label="Window (days)" value={usage.windowDays} />
            <Metric label="Total AI events" value={usage.totalEvents} />
            <Metric label="Advisory events" value={usage.advisoryEvents} />
            <Metric label="Card advisory events" value={usage.cardAdvisoryEvents} />
            <Metric label="Unique actors" value={usage.uniqueActors} />
            <Metric label="Workspace coverage" value={usage.workspaceCoverage} />
          </div>
        ) : (
          <EmptyState
            title="No AI usage data"
            description="No AI usage observations are currently available in the selected reporting window."
            className="m-4"
          />
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Policy controls</p>
        <p className="mt-1 text-sm text-gray-600">
          {summary.editableControls.policyEditingEnabled
            ? "Editable controls are enabled."
            : `Read-only in this phase. ${summary.editableControls.reason}`}
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Policy notes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          {summary.policyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
