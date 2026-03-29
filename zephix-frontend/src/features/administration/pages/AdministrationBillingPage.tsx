import { useCallback, useEffect, useState } from "react";
import {
  administrationApi,
  type BillingInvoice,
  type BillingSummary,
  type PageMeta,
} from "@/features/administration/api/administration.api";
import { PageHeader } from "@/ui/components/PageHeader";
import { ErrorState } from "@/ui/components/ErrorState";

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatCurrency(amountCents: number, currency: string): string {
  const normalized = (currency || "USD").toUpperCase();
  const amount = Number.isFinite(amountCents) ? amountCents / 100 : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalized}`;
  }
}

function formatStorageBytes(bytes: number): string {
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

export default function AdministrationBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoiceMeta, setInvoiceMeta] = useState<PageMeta | null>(null);

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, invoicesData] = await Promise.all([
        administrationApi.getBillingSummary(),
        administrationApi.getBillingInvoices({ page: 1, limit: 20 }),
      ]);
      setSummary(summaryData);
      setInvoices(invoicesData.data);
      setInvoiceMeta(invoicesData.meta);
    } catch {
      setError("Unable to load billing data right now. Please try again.");
      setSummary(null);
      setInvoices([]);
      setInvoiceMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [summaryData, invoicesData] = await Promise.all([
          administrationApi.getBillingSummary(),
          administrationApi.getBillingInvoices({ page: 1, limit: 20 }),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setInvoices(invoicesData.data);
        setInvoiceMeta(invoicesData.meta);
      } catch {
        if (active) {
          setError("Unable to load billing data right now. Please try again.");
          setSummary(null);
          setInvoices([]);
          setInvoiceMeta(null);
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
      <PageHeader
        title="Billing"
        subtitle="Organization-level billing governance visibility for plan state, usage, and invoice records."
      />

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-900">Read-only mode</h2>
        <p className="mt-1 text-sm text-amber-800">
          Billing controls are intentionally disabled in this phase. This page is visibility-only.
        </p>
      </section>

      {error ? (
        <ErrorState title="Billing governance unavailable" description={error} onRetry={loadBillingData} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Current plan</h2>
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading plan...</p>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              {summary?.currentPlan || "Unknown"} • {summary?.planStatus || "Unknown"} • Renewal:{" "}
              {formatDate(summary?.renewalDate ?? null)}
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
              {summary?.usage.workspaces ?? 0} • Storage:{" "}
              {formatStorageBytes(summary?.usage.storageBytesUsed ?? 0)}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Payment method visibility</h2>
          <p className="mt-2 text-sm text-gray-600">
            Payment method details are not exposed by current admin billing contracts. Upgrades and
            payment mutations remain disabled in this phase.
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
                  <p className="font-medium text-gray-900">{invoice.invoiceId}</p>
                  <p className="text-gray-600">
                    {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                  </p>
                  <p className="text-gray-600">
                    {invoice.status} • {formatCurrency(invoice.amountCents, invoice.currency)} • Issued{" "}
                    {formatDate(invoice.issuedAt)}
                  </p>
                </div>
              ))}
              {invoiceMeta?.total ? (
                <p className="pt-1 text-xs text-gray-500">
                  Showing {invoices.length} of {invoiceMeta.total} invoices.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
