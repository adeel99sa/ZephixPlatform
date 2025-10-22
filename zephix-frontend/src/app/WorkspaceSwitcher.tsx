import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

const MOCK = [
  { id: 'ws-1', name: 'Company Portfolio' },
  { id: 'ws-2', name: 'R&D' },
];

export default function WorkspaceSwitcher() {
  const { workspaceId, setWorkspaceId } = useUIStore();
  const [open, setOpen] = useState(false);
  const current = MOCK.find(w => w.id === workspaceId) ?? MOCK[0];

  return (
    <div className="relative">
      <button className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setOpen(v => !v)}>
        <span className="truncate">{current.name}</span>
        <span className="i-lucide-chevron-down" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow">
          {MOCK.map(w => (
            <button key={w.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => { setWorkspaceId(w.id); setOpen(false); }}>
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
