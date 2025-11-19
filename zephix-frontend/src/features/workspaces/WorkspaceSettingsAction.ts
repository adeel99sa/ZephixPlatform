import { track } from "@/lib/telemetry";
import { openWorkspaceSettingsModal } from "./components/WorkspaceSettingsModal/controller";
import { useWorkspaceStore } from "@/state/workspace.store";

type CommandPalette = {
  register: (id: string, label: string, run: () => void) => void;
};

/** Registers the ⌘K action. Call this once at app boot. */
export function registerWorkspaceSettingsAction(commandPalette: CommandPalette) {
  commandPalette.register(
    "workspace.settings",
    "Workspace Settings",
    () => {
      const id = useWorkspaceStore.getState().activeWorkspaceId;
      if (!id) return; // no active workspace → ignore
      track("workspace.settings.opened", { workspaceId: id });
      openWorkspaceSettingsModal(id);
    }
  );
}


