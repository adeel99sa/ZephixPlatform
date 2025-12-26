import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { useAuth } from "@/state/AuthContext";

type Workspace = {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  isPrivate?: boolean;
  deletedAt?: string | null;
};

export default function WorkspacesPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Workspace|null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspaces", { includeDeleted: false }],
    queryFn: async () => {
      // Guard: Don't fire requests until auth state is READY
      if (authLoading || !user) {
        return [];
      }
      const response = await api.get<{ data: Workspace[] }>("/workspaces");
      // Backend returns { data: Workspace[] }, extract data field
      return response?.data?.data || response?.data || [];
    },
    enabled: !authLoading && !!user, // Only run query when auth is ready
  });

  const createOrUpdate = useMutation({
    mutationFn: async (input: Partial<Workspace>) =>
      editing
        ? (await api.patch(`/workspaces/${editing.id}`, input)).data
        : (await api.post("/workspaces", input)).data,
    onSuccess: () => { setOpen(false); setEditing(null); qc.invalidateQueries({queryKey:["workspaces"]}); }
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/workspaces/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({queryKey:["workspaces"]})
  });

  const restore = useMutation({
    mutationFn: async (id: string) => (await api.post(`/workspaces/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({queryKey:["workspaces"]})
  });

  if (isLoading) return <div>Loading…</div>;
  if (error)     return <div>Error loading workspaces</div>;

  // Ensure data is an array
  const workspaces = Array.isArray(data) ? data : [];

  return (
    <div className="p-6" data-testid="workspaces-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="workspaces-title">Workspaces</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                data-testid="btn-new-workspace"
                onClick={() => { setEditing(null); setOpen(true); }}>
          New workspace
        </button>
      </div>

      <ul className="mt-6 divide-y rounded-xl border" data-testid="workspaces-list">
        {workspaces.map(ws => (
          <li key={ws.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{ws.name}</div>
              <div className="text-xs text-gray-500">{ws.slug}</div>
            </div>
            <div className="flex gap-2">
              {ws.deletedAt
                ? <button className="px-2 py-1 rounded border"
                          data-testid={`restore-${ws.id}`}
                          onClick={() => restore.mutate(ws.id)}>Restore</button>
                : <>
                    <button className="px-2 py-1 rounded border"
                            data-testid={`edit-${ws.id}`}
                            onClick={() => { setEditing(ws); setOpen(true); }}>Edit</button>
                    <button className="px-2 py-1 rounded border text-red-600"
                            data-testid={`delete-${ws.id}`}
                            onClick={() => softDelete.mutate(ws.id)}>Delete</button>
                  </>
              }
            </div>
          </li>
        ))}
      </ul>

      {open && <WorkspaceModal
        defaultValues={editing ?? { name:"", description:"", slug:"" }}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSave={(payload) => createOrUpdate.mutate(payload)}
      />}
    </div>
  );
}

function WorkspaceModal({
  defaultValues, onClose, onSave
}: {
  defaultValues: Partial<Workspace>,
  onClose: () => void,
  onSave: (payload: Partial<Workspace>) => void
}) {
  const [form, setForm] = useState(defaultValues);
  return (
    <div className="fixed inset-0 bg-black/20 grid place-items-center" role="dialog">
      <div className="bg-white p-4 rounded-xl w-[420px] space-y-3" data-testid="workspace-modal">
        <div className="text-base font-semibold">{defaultValues?.id ? "Edit workspace" : "New workspace"}</div>
        <label className="block text-sm">Name
          <input className="mt-1 w-full rounded border px-2 py-1"
                 data-testid="ws-input-name"
                 value={form.name ?? ""}
                 onChange={e => setForm(f => ({...f, name: e.target.value}))}/>
        </label>
        <label className="block text-sm">Slug
          <input className="mt-1 w-full rounded border px-2 py-1"
                 data-testid="ws-input-slug"
                 value={form.slug ?? ""}
                 onChange={e => setForm(f => ({...f, slug: e.target.value}))}/>
        </label>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1.5 rounded-lg border bg-gray-50"
                  data-testid="ws-save"
                  onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}
