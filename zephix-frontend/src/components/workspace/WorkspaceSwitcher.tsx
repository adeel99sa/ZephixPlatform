import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listWorkspaces } from "@/features/workspaces/api";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import WorkspaceMenu from "./WorkspaceMenu";

export default function WorkspaceSwitcher() {
  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });
  const ws = useWorkspaceStore();

  useEffect(() => { if (data?.length) ws.setWorkspaces(data); }, [data]);

  if (isLoading) return <span className="text-sm text-slate-500">Loading workspaces…</span>;
  if (!ws.current) return <span className="text-sm text-slate-500">No workspaces</span>;

  return (
    <div className="inline-flex items-center gap-2" data-testid="workspace-switcher">
      <span className="text-sm text-slate-500">Workspace:</span>
      <select
        className="rounded-md border px-2 py-1 text-sm"
        value={ws.current.id}
        onChange={(e) => ws.setCurrent(e.target.value)}
      >
        {ws.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <WorkspaceMenu />
    </div>
  );
}
