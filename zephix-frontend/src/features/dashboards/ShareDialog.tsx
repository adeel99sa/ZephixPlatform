import { useState } from 'react';
import { track } from '@/lib/telemetry';
import { useUIStore } from '@/stores/uiStore';

type Props = {
  initialVisibility: 'private'|'workspace'|'org';
  onSave: (v: 'private'|'workspace'|'org') => Promise<void> | void;
  onClose: () => void;
};

export default function ShareDialog({ initialVisibility, onSave, onClose }: Props) {
  const [visibility, setVisibility] = useState<typeof initialVisibility>(initialVisibility);
  const addToast = useUIStore((s) => s.addToast);

  const save = async () => {
    await onSave(visibility);
    track('ui.dashboard.share.save', { visibility });
    addToast({ type: 'success', title: 'Visibility updated' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" data-testid="share-dialog">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="z-10 w-[520px] rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-2 text-base font-semibold">Share & Visibility</div>
        <div className="mb-4 text-sm text-neutral-600">Choose who can view this dashboard.</div>

        <div className="mb-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="v" value="private" checked={visibility==='private'} onChange={() => setVisibility('private')} />
            Private (only you)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="v" value="workspace" checked={visibility==='workspace'} onChange={() => setVisibility('workspace')} />
            Workspace (members)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="v" value="org" checked={visibility==='org'} onChange={() => setVisibility('org')} />
            Organization (all)
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button className="rounded-md px-3 py-1 text-sm hover:bg-neutral-100" onClick={onClose}>Cancel</button>
          <button className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white hover:bg-black" onClick={save} data-testid="share-save">Save</button>
        </div>
      </div>
    </div>
  );
}
