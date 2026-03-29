import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input/Input";


type BillingState = {
  billingContactEmail: string;
};

const INITIAL: BillingState = {
  billingContactEmail: "",
};

type InvoiceRow = {
  id: string;
  date: string;
  amount: string;
  status: "Paid" | "Pending" | "Failed";
};

const MOCK_INVOICES: InvoiceRow[] = [
  { id: "1", date: "2026-02-01", amount: "$299.00", status: "Paid" },
  { id: "2", date: "2026-01-01", amount: "$299.00", status: "Paid" },
  { id: "3", date: "2025-12-01", amount: "$299.00", status: "Pending" },
];

function statusBadgeClasses(status: InvoiceRow["status"]): string {
  switch (status) {
    case "Paid":
      return "bg-emerald-100 text-emerald-800";
    case "Pending":
      return "bg-amber-100 text-amber-900";
    case "Failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

/** Display-only labels — not live billing status. */
function invoiceStatusPreviewLabel(status: InvoiceRow["status"]): string {
  switch (status) {
    case "Paid":
      return "Preview — settled";
    case "Pending":
      return "Preview — open";
    case "Failed":
      return "Preview — failed";
    default:
      return status;
  }
}

export default function BillingSettings(): ReactElement {
  const [state, setState] = useState<BillingState>(INITIAL);
  const [saved, setSaved] = useState<BillingState>(INITIAL);

  const dirty = useMemo(
    () => state.billingContactEmail !== saved.billingContactEmail,
    [state.billingContactEmail, saved.billingContactEmail],
  );

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-billing>
      <SettingsPageHeader
        title="Billing & Plan"
        description="Sample billing layout for preview — not your live subscription, invoices, or payment method."
      />

      <div className="mb-10 rounded-xl border border-indigo-100 bg-indigo-600 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-100">Sample plan (preview)</p>
            <p className="text-xl font-bold tracking-tight">Sample tier — preview</p>
            <p className="mt-1 text-sm text-indigo-100">
              Placeholder copy for layout — not your actual plan or entitlements.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 border-0 bg-white text-indigo-700 hover:bg-indigo-50"
            onClick={() => {
              /* UI only — upgrade flow in a later milestone */
            }}
          >
            Preview upgrade CTA
          </Button>
        </div>
      </div>

      <SettingsSection title="Payment Method">
        <SettingsRow
          label="Card on file"
          description="Sample payment method row — not a real card on file."
          control={
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-slate-900">
                Sample card ending 4242 (preview)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  /* UI only */
                }}
              >
                Preview card update
              </Button>
            </div>
          }
        />
        <SettingsRow
          label="Billing contact email"
          description="Preview field — not saved to billing."
          control={
            <Input
              className="w-full min-w-[240px] max-w-sm"
              type="email"
              placeholder="finance@company.com"
              value={state.billingContactEmail}
              onChange={(e) =>
                setState((s) => ({ ...s, billingContactEmail: e.target.value }))
              }
              autoComplete="email"
              aria-label="Billing contact email"
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Billing History">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-800">{row.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.amount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(row.status)}`}
                    >
                      {invoiceStatusPreviewLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() => {
                        /* UI only — no download */
                      }}
                    >
                      Preview download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <footer className="mt-10 flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!dirty} onClick={handleSave}>
          Save locally
        </Button>
      </footer>
    </div>
  );
}
