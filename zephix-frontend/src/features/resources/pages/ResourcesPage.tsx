import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResourcesList, useResourceAllocations } from '../api/useResources';
import ResourceHeatmap from '../components/ResourceHeatmap';

export default function ResourcesPage() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 20);
  const search = sp.get('search') || '';
  const dept = sp.get('dept') || '';
  const { data, isLoading, error } = useResourcesList({ search, dept, page, pageSize });

  function update(key: string, val: string) {
    const next = new URLSearchParams(sp);
    if (val) next.set(key, val); else next.delete(key);
    setSp(next, { replace: true });
  }

  if (error) return <div role="alert">Something went wrong</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Resources</h1>
      <div className="flex gap-2">
        <input className="input input-bordered w-64" placeholder="Search name or role"
          value={search} onChange={e => update('search', e.target.value)} />
        <input className="input input-bordered w-48" placeholder="Dept"
          value={dept} onChange={e => update('dept', e.target.value)} />
      </div>

      {isLoading && <div>Loading…</div>}
      {!isLoading && data && (
        <table className="table w-full">
          <thead><tr><th>Name</th><th>Role</th><th>Dept</th><th>Heatmap</th></tr></thead>
          <tbody>
            {data.items.map(r => {
              const { data: allocs } = useResourceAllocations(r.id, 8);
              return (
                <tr key={r.id} className="hover">
                  <td>{r.name}</td>
                  <td>{r.role}</td>
                  <td>{r.dept || '-'}</td>
                  <td>{allocs ? <ResourceHeatmap data={allocs} /> : '…'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
