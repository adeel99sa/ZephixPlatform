import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type WS = { id: string; name: string; slug?: string };

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WS[]>([]);
  const [current, setCurrent] = useState<WS | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/workspaces");
        const list: WS[] = Array.isArray(res.data?.data) ? res.data.data : (res.data ?? []);
        setItems(list);
        setCurrent(list[0] ?? null);
      } catch { /* swallow */ }
    })();
  }, []);

  return (
    <div className="relative" data-testid="workspace-switcher">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
        onClick={() => setOpen(o => !o)}
        data-testid="workspace-switcher-button"
        aria-haspopup="menu" aria-expanded={open}
      >
        <span className="font-medium">{current?.name ?? "Select workspace"}</span>
        <svg width="12" height="12" viewBox="0 0 20 20"><path d="M5 7l5 5 5-5" stroke="currentColor" fill="none"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-56 rounded-xl border bg-white shadow" role="menu"
             onMouseLeave={() => setOpen(false)}>
          {items.map(ws => (
            <button key={ws.id}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50"
              data-testid={`ws-item-${ws.id}`}
              onClick={() => { setCurrent(ws); setOpen(false); }}>
              {ws.name}
            </button>
          ))}
          <div className="border-t my-1" />
          <a className="block px-3 py-2 hover:bg-gray-50" href="/workspaces" data-testid="ws-manage-link">
            Manage workspaces…
          </a>
        </div>
      )}
    </div>
  );
}