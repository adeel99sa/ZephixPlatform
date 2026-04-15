import { Building2, Palette, Trash2 } from "lucide-react";
import { OrganizationProfileForm } from "../components/OrganizationProfileForm";

/**
 * Administration → General — organization profile and branding (Pre-MVP design lock v2).
 */
export default function AdministrationGeneralPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">General</h1>
        <p className="mt-1 text-sm text-gray-600">
          Organization name, industry, and public details. Branding tools will follow in a later
          release.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Organization profile</h2>
          <p className="mt-0.5 text-xs text-gray-500">Name, industry, website, and description.</p>
        </div>
        <div className="p-4">
          <OrganizationProfileForm />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-gray-500" aria-hidden />
            <h2 className="text-sm font-semibold text-gray-900">Org branding</h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Logos, colors, and email templates.</p>
        </div>
        <div className="p-8 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-sm text-slate-600">
            Branding controls are not available yet. This area will host logo upload, primary
            colors, and outbound email styling.
          </p>
          <span className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Coming soon
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-red-100 bg-red-50/40">
        <div className="border-b border-red-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-700" aria-hidden />
            <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
          </div>
        </div>
        <div className="p-4">
          <button
            type="button"
            disabled
            title="Contact support to delete an organization."
            className="cursor-not-allowed rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 opacity-60"
          >
            Delete organization
          </button>
          <p className="mt-2 text-xs text-red-800/80">
            Organization deletion is disabled. Contact support if you need to close this
            organization.
          </p>
        </div>
      </section>
    </div>
  );
}
