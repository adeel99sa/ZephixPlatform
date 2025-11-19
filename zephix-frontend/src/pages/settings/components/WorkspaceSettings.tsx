import { track } from "@/lib/telemetry";

export function WorkspaceSettings(){
  const handleSave = () => {
    track('settings.workspace.saved', {});
    // TODO: Implement save functionality
  };

  return (
    <section data-testid="settings-workspace" className="space-y-3">
      <h2 className="font-medium">Workspace</h2>
      <div className="grid gap-2">
        <label className="grid">
          <span>Default template</span>
          <select data-testid="settings-workspace-default-template" className="input">
            <option value="">None</option>
          </select>
        </label>
      </div>
      <button type="button" data-testid="settings-workspace-save" onClick={handleSave} className="btn-primary">Save</button>
    </section>
  );
}

