import { track } from "@/lib/telemetry";

export function OrganizationSettings(){
  const handleSave = () => {
    track('settings.organization.saved', {});
    // TODO: Implement save functionality
  };

  return (
    <section data-testid="settings-organization" className="space-y-3">
      <h2 className="font-medium">Organization</h2>
      <div className="grid gap-2">
        <label className="grid">
          <span>Invite URL</span>
          <input data-testid="settings-org-invite-url" className="input" placeholder="https://..." />
        </label>
      </div>
      <button type="button" data-testid="settings-organization-save" onClick={handleSave} className="btn-primary">Save</button>
    </section>
  );
}

