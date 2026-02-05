import React, { useState } from 'react';
import { apiClient } from '@/lib/api/client';

type Kpi = { id: string; name: string; description?: string; calcType: 'provided'|'derived' };
export default function KpiCatalogPage() {
  const [items, setItems] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [calcType, setCalcType] = useState<'provided'|'derived'>('provided');

  async function load() {
    setLoading(true);
    const response = await apiClient.get<{ data: Kpi[] }>('/admin/kpis');
    const data = response.data?.data ?? response.data ?? [];
    setItems(data as Kpi[]);
    setLoading(false);
  }
  async function create() {
    await apiClient.post('/admin/kpis', { name, calcType });
    load();
  }

  React.useEffect(()=>{ load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">KPI Catalog</h1>
      <div className="flex gap-2">
        <input className="input input-bordered" placeholder="KPI name" value={name} onChange={e=>setName(e.target.value)} />
        <select className="select select-bordered" value={calcType} onChange={e=>setCalcType(e.target.value as any)}>
          <option value="provided">Provided</option>
          <option value="derived">Derived</option>
        </select>
        <button className="btn btn-primary" onClick={create}>Add</button>
      </div>
      {loading ? 'Loading…' : (
        <ul className="list-disc pl-6">
          {items.map(k => <li key={k.id}>{k.name} <span className="opacity-60">({k.calcType})</span></li>)}
        </ul>
      )}
    </div>
  );
}
