import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useState } from 'react';

type SecurityPolicy = { passwordMinLength: number; mfaRequired: boolean; ipWhitelist: string[] };

export default function SecurityPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','security'],
    queryFn: async () => (await apiClient.get('/admin/security')).data as SecurityPolicy,
  });

  const [draft, setDraft] = useState<Partial<SecurityPolicy>>({});

  const save = useMutation({
    mutationFn: async (payload: Partial<SecurityPolicy>) =>
      (await apiClient.patch('/admin/security', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','security'] }),
  });

  if (isLoading) return <div>Loading security…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;
  if (!data) return <div>No security policy defined.</div>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Security Policies</h1>

      <label className="block">
        <span className="text-sm">Password min length</span>
        <input
          type="number"
          className="mt-1 w-full border rounded px-3 py-2"
          defaultValue={data.passwordMinLength}
          onChange={(e) => setDraft(d => ({ ...d, passwordMinLength: Number(e.target.value) }))}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          defaultChecked={data.mfaRequired}
          onChange={(e) => setDraft(d => ({ ...d, mfaRequired: e.target.checked }))}
        />
        <span>Require MFA for all users</span>
      </label>

      <label className="block">
        <span className="text-sm">IP Whitelist (comma separated)</span>
        <textarea
          className="mt-1 w-full border rounded px-3 py-2"
          defaultValue={data.ipWhitelist.join(', ')}
          onChange={(e) => setDraft(d => ({ ...d, ipWhitelist: splitIps(e.target.value) }))}
        />
      </label>

      <button className="px-4 py-2 rounded bg-black text-white" onClick={() => save.mutate(draft)}>Save</button>
    </div>
  );
}
function splitIps(s: string){return s.split(',').map(x=>x.trim()).filter(Boolean)}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
