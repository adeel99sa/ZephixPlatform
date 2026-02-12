/**
 * DefinitionOfDonePanel — read/edit list of DoD items for project settings.
 * Admin/Owner can edit. Members view only.
 */
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, X } from 'lucide-react';

interface Props {
  items: string[];
  onSave: (items: string[]) => Promise<void>;
  canEdit: boolean;
}

const MAX_ITEMS = 20;
const MAX_TEXT = 240;

export function DefinitionOfDonePanel({ items, onSave, canEdit }: Props) {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const persist = async (updated: string[]) => {
    setError(null);
    setSaving(true);
    try {
      await onSave(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
      setLocalItems(items);
    } finally {
      setSaving(false);
    }
  };

  const handleTextChange = (index: number, text: string) => {
    const updated = localItems.map((item, i) => (i === index ? text.slice(0, MAX_TEXT) : item));
    setLocalItems(updated);
  };

  const handleBlur = () => {
    const cleaned = localItems.map((s) => s.trim()).filter((s) => s.length > 0);
    setLocalItems(cleaned);
    persist(cleaned);
  };

  const handleAdd = () => {
    if (!newText.trim() || localItems.length >= MAX_ITEMS) return;
    const updated = [...localItems, newText.trim().slice(0, MAX_TEXT)];
    setLocalItems(updated);
    setNewText('');
    persist(updated);
  };

  const handleRemove = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated);
    persist(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div data-testid="dod-panel">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Definition of Done</h2>
        {saving && <span className="text-xs text-blue-500">Saving...</span>}
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {localItems.length === 0 && !canEdit && (
        <p className="text-sm text-gray-400">No Definition of Done set for this project.</p>
      )}

      <div className="space-y-2">
        {localItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <span className="text-sm text-gray-500 w-5 text-right">{index + 1}.</span>
            {canEdit ? (
              <input
                type="text"
                value={item}
                onChange={(e) => handleTextChange(index, e.target.value)}
                onBlur={handleBlur}
                className="text-sm flex-1 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                maxLength={MAX_TEXT}
                data-testid="dod-text-input"
              />
            ) : (
              <span className="text-sm text-gray-700 flex-1">{item}</span>
            )}
            {canEdit && (
              <button
                onClick={() => handleRemove(index)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && localItems.length < MAX_ITEMS && (
        <div className="flex items-center gap-2 mt-3">
          <Plus className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value.slice(0, MAX_TEXT))}
            onKeyDown={handleKeyDown}
            placeholder="Add DoD item..."
            className="text-sm flex-1 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-300"
            data-testid="dod-new-input"
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 px-2 py-1"
            data-testid="dod-add-btn"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
