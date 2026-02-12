/**
 * AcceptanceCriteriaEditor — inline editor for task acceptance criteria.
 * - Checkbox toggle: optimistic save
 * - Text edit: debounced 600ms save on blur
 * - Add/remove items
 * - Max 20 items, 240 chars each
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CheckSquare, Plus, X } from 'lucide-react';
import type { AcceptanceCriteriaItem } from '../workTasks.api';

interface Props {
  items: AcceptanceCriteriaItem[];
  onSave: (items: AcceptanceCriteriaItem[]) => Promise<void>;
  readOnly?: boolean;
}

const MAX_ITEMS = 20;
const MAX_TEXT = 240;

export function AcceptanceCriteriaEditor({ items, onSave, readOnly = false }: Props) {
  const [localItems, setLocalItems] = useState<AcceptanceCriteriaItem[]>(items);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when items change externally
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const persistItems = useCallback(async (updated: AcceptanceCriteriaItem[]) => {
    setError(null);
    setSaving(true);
    try {
      await onSave(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
      setLocalItems(items); // revert
    } finally {
      setSaving(false);
    }
  }, [onSave, items]);

  const handleToggle = (index: number) => {
    if (readOnly) return;
    const updated = localItems.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item,
    );
    setLocalItems(updated);
    persistItems(updated);
  };

  const handleTextChange = (index: number, text: string) => {
    if (readOnly) return;
    const trimmed = text.slice(0, MAX_TEXT);
    const updated = localItems.map((item, i) =>
      i === index ? { ...item, text: trimmed } : item,
    );
    setLocalItems(updated);

    // Debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persistItems(updated), 600);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    persistItems(localItems);
  };

  const handleAdd = () => {
    if (readOnly || !newText.trim() || localItems.length >= MAX_ITEMS) return;
    const updated = [...localItems, { text: newText.trim().slice(0, MAX_TEXT), done: false }];
    setLocalItems(updated);
    setNewText('');
    persistItems(updated);
  };

  const handleRemove = (index: number) => {
    if (readOnly) return;
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated);
    persistItems(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const doneCount = localItems.filter((i) => i.done).length;

  return (
    <div className="mt-3 pt-3 border-t" data-testid="acceptance-criteria">
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare className="h-4 w-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-700">Acceptance Criteria</h4>
        {localItems.length > 0 && (
          <span className="text-xs text-gray-400">
            {doneCount}/{localItems.length}
          </span>
        )}
        {saving && <span className="text-xs text-blue-500">Saving...</span>}
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {localItems.length === 0 && readOnly && (
        <p className="text-xs text-gray-400 italic">No acceptance criteria defined.</p>
      )}

      <div className="space-y-1">
        {localItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => handleToggle(index)}
              disabled={readOnly}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
              data-testid="ac-checkbox"
            />
            {readOnly ? (
              <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.text}
              </span>
            ) : (
              <input
                type="text"
                value={item.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                onBlur={handleBlur}
                className={`text-sm flex-1 border-0 border-b border-transparent focus:border-gray-300 focus:ring-0 px-1 py-0.5 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}
                maxLength={MAX_TEXT}
                data-testid="ac-text-input"
              />
            )}
            {!readOnly && (
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

      {!readOnly && localItems.length < MAX_ITEMS && (
        <div className="flex items-center gap-2 mt-2">
          <Plus className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value.slice(0, MAX_TEXT))}
            onKeyDown={handleKeyDown}
            placeholder="Add acceptance criterion..."
            className="text-sm flex-1 border-0 border-b border-gray-200 focus:border-blue-400 focus:ring-0 px-1 py-0.5 text-gray-600 placeholder:text-gray-300"
            data-testid="ac-new-input"
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300"
            data-testid="ac-add-btn"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
