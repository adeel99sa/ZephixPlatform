import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRisksList, useBulkAssign } from '../api/useRisks';

export default function RisksPage() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || 1);
  const status = sp.get('status') || '';
  const severity = sp.get('severity') || '';
  const { data, isLoading, error } = useRisksList({ status, severity, page, pageSize: 20 });
  const bulk = useBulkAssign();

  function update(key: string, val: string) {
    const next = new URLSearchParams(sp);
    if (val) next.set(key, val); else next.delete(key);
    setSp(next, { replace: true });
  }

  if (error) return <div role="alert">Something went wrong</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Risks</h1>
      <div className="flex gap-2">
        <select className="select select-bordered" value={severity} onChange={e=>update('severity', e.target.value)}>
          <option value="">All severities</option><option>low</option><option>medium</option><option>high</option>
        </select>
        <select className="select select-bordered" value={status} onChange={e=>update('status', e.target.value)}>
          <option value="">All status</option><option>open</option><option>mitigating</option><option>closed</option>
        </select>
      </div>

      {isLoading && <div>Loading…</div>}
      {!isLoading && data && (
        <table className="table w-full">
          <thead><tr><th>Title</th><th>Severity</th><th>Status</th><th>Owner</th></tr></thead>
          <tbody>
          {data.items.map(r => (
            <tr key={r.id} className="hover"><td>{r.title}</td><td>{r.severity}</td><td>{r.status}</td><td>{r.owner || '-'}</td></tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
