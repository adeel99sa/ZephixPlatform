import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useState } from 'react';

type OrgProfile = { id: string; name: string; timezone: string; fiscalYearStart: string };

export default function OrganizationPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','organization'],
    queryFn: async () => (await apiClient.get('/admin/profile')).data as OrgProfile,
  });

  const [draft, setDraft] = useState<Partial<OrgProfile>>({});

  const mutation = useMutation({
    mutationFn: async (payload: Partial<OrgProfile>) =>
      (await apiClient.patch('/admin/profile', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','organization'] }),
  });

  if (isLoading) return <div>Loading organization…</div>;
  if (error) return <div className="text-red-600">{formatErr(error)}</div>;
  if (!data) return <div>No organization profile.</div>;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Organization</h1>

      <label className="block">
        <span className="text-sm">Name</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          defaultValue={data.name}
          onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
        />
      </label>

      <label className="block">
        <span className="text-sm">Timezone</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          defaultValue={data.timezone}
          onChange={(e) => setDraft(d => ({ ...d, timezone: e.target.value }))}
        />
      </label>

      <label className="block">
        <span className="text-sm">Fiscal Year Start (YYYY-MM-DD)</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          defaultValue={data.fiscalYearStart}
          onChange={(e) => setDraft(d => ({ ...d, fiscalYearStart: e.target.value }))}
        />
      </label>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded bg-gray-200"
          onClick={() => setDraft({})}
        >Reset</button>
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => mutation.mutate(draft)}
        >Save</button>
      </div>
    </div>
  );
}

function formatErr(e: unknown) {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
}
