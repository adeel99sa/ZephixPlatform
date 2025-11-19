import { track } from "@/lib/telemetry";

export function AccountSettings(){
  const handleSave = () => {
    track('settings.account.saved', {});
    // TODO: Implement save functionality
  };

  return (
    <section data-testid="settings-account" className="space-y-3">
      <h2 className="font-medium">Account</h2>
      <div className="grid gap-2">
        <label className="grid">
          <span>Name</span>
          <input data-testid="settings-account-name" className="input" />
        </label>
        <label className="grid">
          <span>Password</span>
          <input type="password" data-testid="settings-account-password" className="input" />
        </label>
      </div>
      <button type="button" data-testid="settings-account-save" onClick={handleSave} className="btn-primary">Save</button>
    </section>
  );
}

