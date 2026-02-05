import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { createWorkspace } from "@/features/workspaces/api";
import { api } from "@/lib/api";

export default function WorkspaceMenu() {
  const [open, setOpen] = useState(false);
  const ws = useWorkspaceStore();
  const queryClient = useQueryClient();

  const createWS = useMutation({
    mutationFn: (name: string) => createWorkspace({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const createProj = useMutation({
    mutationFn: (data: { workspaceId: string; name: string }) =>
      api.post(`/projects`, { workspaceId: data.workspaceId, name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <div className="relative">
      <button id="ws-menu-btn" className="rounded-md border px-2 py-1 text-sm"
              onClick={() => setOpen(o => !o)}>⋯</button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-md border bg-white p-1 shadow">
          <button className="w-full rounded px-2 py-1 text-left hover:bg-slate-50"
            onClick={async () => { const name = prompt("New workspace name?"); if (!name) return;
              await createWS.mutateAsync(name); setOpen(false); }}>
            New workspace…
          </button>
          <button className="w-full rounded px-2 py-1 text-left hover:bg-slate-50"
            onClick={async () => { if (!ws.current) return; const name = prompt("New project name?");
              if (!name) return; await createProj.mutateAsync({ workspaceId: ws.current.id, name });
              setOpen(false); }}>
            New project in current…
          </button>
        </div>
      )}
    </div>
  );
}
