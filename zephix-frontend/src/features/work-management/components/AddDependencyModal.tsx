import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DependencyType, searchWorkItems, addWorkItemDependency, WorkItemRow } from '../api';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  workItemId: string;
  onAdded: () => void;
};

const TYPE_LABEL: Record<DependencyType, string> = {
  FS: 'Finish to Start',
  SS: 'Start to Start',
  FF: 'Finish to Finish',
  SF: 'Start to Finish',
};

function groupByProject(items: WorkItemRow[]) {
  const map = new Map<string, WorkItemRow[]>();
  for (const it of items) {
    const key = it.projectName || 'Unknown project';
    const arr = map.get(key) || [];
    arr.push(it);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([projectName, rows]) => ({ projectName, rows }));
}

export default function AddDependencyModal(props: Props) {
  const { open, onClose, projectId, workItemId, onAdded } = props;

  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<WorkItemRow[]>([]);
  const [pickedId, setPickedId] = useState<string>('');
  const [depType, setDepType] = useState<DependencyType>('FS');
  const [lagDays, setLagDays] = useState<number>(0);

  const grouped = useMemo(() => groupByProject(results), [results]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setResults([]);
    setPickedId('');
    setDepType('FS');
    setLagDays(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setPickedId('');
      return;
    }

    let alive = true;
    setSearching(true);

    const t = setTimeout(async () => {
      try {
        const rows = await searchWorkItems(query, 50);
        if (!alive) return;

        const filtered = (rows || []).filter((r) => r.id && r.id !== workItemId);
        setResults(filtered);
      } catch (e: any) {
        if (!alive) return;
        setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, open, workItemId]);

  async function submit() {
    if (!pickedId) {
      toast.error('Select a work item to depend on.');
      return;
    }

    setBusy(true);
    try {
      await addWorkItemDependency({
        projectId,
        workItemId,
        predecessorId: pickedId,
        type: depType,
        lagDays: Number.isFinite(lagDays) ? lagDays : 0,
      });

      toast.success('Dependency added.');
      onAdded();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to add dependency.';
      toast.error(String(msg));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Add dependency</div>
          <button className="border rounded px-3 py-1" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="md:col-span-2">
            <div className="text-sm mb-1">Search work items</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type at least 2 characters"
              disabled={busy}
            />
            <div className="text-xs text-gray-500 mt-1">
              {searching ? 'Searching...' : 'Search across workspace'}
            </div>
          </div>

          <div>
            <div className="text-sm mb-1">Dependency type</div>
            <select
              className="w-full rounded border px-3 py-2"
              value={depType}
              onChange={(e) => setDepType(e.target.value as DependencyType)}
              disabled={busy}
            >
              <option value="FS">FS, {TYPE_LABEL.FS}</option>
              <option value="SS">SS, {TYPE_LABEL.SS}</option>
              <option value="FF">FF, {TYPE_LABEL.FF}</option>
              <option value="SF">SF, {TYPE_LABEL.SF}</option>
            </select>

            <div className="text-sm mt-3 mb-1">Lag days</div>
            <input
              className="w-full rounded border px-3 py-2"
              type="number"
              value={String(lagDays)}
              onChange={(e) => setLagDays(Number(e.target.value))}
              disabled={busy}
            />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm text-gray-700">
            Pick a predecessor work item
          </div>

          <div className="max-h-72 overflow-auto">
            {grouped.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">
                Type in search to see results.
              </div>
            ) : (
              grouped.map((g) => (
                <div key={g.projectName} className="border-t">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white">
                    {g.projectName}
                  </div>
                  {g.rows.map((r) => (
                    <button
                      key={r.id}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        pickedId === r.id ? 'bg-gray-100' : 'bg-white'
                      }`}
                      onClick={() => setPickedId(r.id)}
                      disabled={busy}
                      type="button"
                    >
                      <div className="text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500">
                        {r.id}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button className="border rounded px-4 py-2" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="rounded px-4 py-2 bg-black text-white disabled:opacity-50" onClick={submit} disabled={busy}>
            {busy ? 'Adding...' : 'Add dependency'}
          </button>
        </div>
      </div>
    </div>
  );
}
