import { OrganizationProfileForm } from "../components/OrganizationProfileForm";

export default function AdministrationOrganizationPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Organization</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your organization profile and details.</p>
      </header>
      <OrganizationProfileForm />
    </div>
  );
}
