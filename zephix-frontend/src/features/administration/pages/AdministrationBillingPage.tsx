import { useEffect, useState } from "react";
import {
  administrationApi,
  type BillingInvoice,
  type BillingSummary,
} from "@/features/administration/api/administration.api";

export default function AdministrationBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, invoicesData] = await Promise.all([
          administrationApi.getBillingSummary(),
          administrationApi.getBillingInvoices({ page: 1, limit: 20 }),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setInvoices(invoicesData.data);
      } catch {
        if (active) {
          setError("Failed to load billing data.");
          setSummary(null);
          setInvoices([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Plan management, usage, upgrades, and invoice visibility.
        </p>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Current plan</h2>
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading plan...</p>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              {summary?.currentPlan || "Unknown"} • {summary?.planStatus || "Unknown"} • Renewal:{" "}
              {summary?.renewalDate || "N/A"}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Usage</h2>
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading usage...</p>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              Active users: {summary?.usage.activeUsers ?? 0} • Workspaces:{" "}
              {summary?.usage.workspaces ?? 0} • Storage bytes:{" "}
              {summary?.usage.storageBytesUsed ?? 0}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Upgrade</h2>
          <p className="mt-2 text-sm text-gray-600">
            Upgrade options and billing impact.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Invoices</h2>
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No invoices available.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm text-gray-700">
              {invoices.map((invoice) => (
                <div key={invoice.invoiceId} className="rounded border border-gray-200 p-2">
                  {invoice.invoiceId} • {invoice.status} • {invoice.amountCents} {invoice.currency}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
