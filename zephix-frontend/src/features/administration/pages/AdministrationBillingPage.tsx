import { CreditCard } from "lucide-react";

/**
 * Billing admin surface — self-serve APIs are not wired under /admin/billing yet.
 * Shows a clear “coming soon” state instead of a failing data fetch.
 */
export default function AdministrationBillingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Plan management, usage, upgrades, and invoice visibility.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CreditCard className="mx-auto mb-4 h-12 w-12 text-slate-300" aria-hidden />
        <h2 className="mb-2 text-lg font-medium text-slate-800">Billing and subscription</h2>
        <p className="mx-auto mb-4 max-w-md text-sm text-slate-500">
          Plan management, invoices, and usage tracking will be available here once the billing
          integration is connected to this console.
        </p>
        <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Coming soon
        </span>
      </div>
    </div>
  );
}
