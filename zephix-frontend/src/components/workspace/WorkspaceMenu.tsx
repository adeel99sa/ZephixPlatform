import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorkspace } from "@/features/workspaces/api";

export default function WorkspaceMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createWS = useMutation({
    mutationFn: (name: string) => createWorkspace({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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
            New workspace...
          </button>
          <button className="w-full rounded px-2 py-1 text-left hover:bg-slate-50"
            onClick={() => { setOpen(false); navigate('/templates'); }}>
            New project from template...
          </button>
        </div>
      )}
    </div>
  );
}
