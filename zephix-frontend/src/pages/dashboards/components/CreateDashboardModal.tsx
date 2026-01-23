import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string }) => Promise<void>;
  scopeLabel: string;
};

export function CreateDashboardModal({ open, onClose, onCreate, scopeLabel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 16,
          backgroundColor: 'white',
          padding: 24,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Create {scopeLabel} Dashboard
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Name *</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dashboard name"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving && name.trim()) {
                  submit();
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              disabled={saving}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 20px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              backgroundColor: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: saving || !name.trim() ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
