export default function AdministrationSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure organization profile, notifications, integrations, and security.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Organization profile</h2>
          <p className="mt-2 text-sm text-gray-600">
            Organization identity and metadata settings.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          <p className="mt-2 text-sm text-gray-600">
            Email and platform notification preferences.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Integrations</h2>
          <p className="mt-2 text-sm text-gray-600">
            External integration configuration and connection status.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Security</h2>
          <p className="mt-2 text-sm text-gray-600">
            Security controls and authentication posture.
          </p>
        </section>
      </div>
    </div>
  );
}
