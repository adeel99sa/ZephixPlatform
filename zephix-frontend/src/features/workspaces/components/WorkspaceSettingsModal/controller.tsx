import { createRoot } from "react-dom/client";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";

export function openWorkspaceSettingsModal(workspaceId: string) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = () => {
    root.unmount();
    host.remove();
  };
  root.render(<WorkspaceSettingsModal workspaceId={workspaceId} onClose={close} />);
}

