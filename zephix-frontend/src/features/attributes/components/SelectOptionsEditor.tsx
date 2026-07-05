import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

import {
  SELECT_OPTION_COLORS,
  slugifyOptionKey,
  buildSelectOptionsPayload,
  type AttributeSelectChoice,
} from '../attributeOptions.utils';

export type SelectOptionsEditorProps = {
  choices: AttributeSelectChoice[];
  onChange: (choices: AttributeSelectChoice[]) => void;
};

function emptyChoice(order: number): AttributeSelectChoice {
  return {
    key: '',
    label: '',
    color: SELECT_OPTION_COLORS[order % SELECT_OPTION_COLORS.length],
    order,
  };
}

export function SelectOptionsEditor({ choices, onChange }: SelectOptionsEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const updateChoice = (index: number, patch: Partial<AttributeSelectChoice>) => {
    onChange(
      choices.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...patch };
        if (patch.label !== undefined && !c.key) {
          next.key = slugifyOptionKey(patch.label);
        }
        return next;
      }),
    );
  };

  const moveChoice = (from: number, to: number) => {
    if (to < 0 || to >= choices.length) return;
    const next = [...choices];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.map((c, i) => ({ ...c, order: i })));
  };

  const removeChoice = (index: number) => {
    onChange(choices.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i })));
  };

  return (
    <div className="space-y-2" data-testid="select-options-editor">
      {choices.map((choice, index) => (
        <div
          key={`${choice.key}-${index}`}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex == null || dragIndex === index) return;
            moveChoice(dragIndex, index);
            setDragIndex(null);
          }}
          className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-1.5 py-1"
          data-testid={`select-option-row-${index}`}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-400" aria-hidden />
          <input
            type="color"
            value={choice.color ?? SELECT_OPTION_COLORS[index % SELECT_OPTION_COLORS.length]}
            onChange={(e) => updateChoice(index, { color: e.target.value })}
            className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            aria-label={`Color for ${choice.label || 'option'}`}
            data-testid={`select-option-color-${index}`}
          />
          <input
            type="text"
            value={choice.label}
            placeholder="Option label"
            onChange={(e) => updateChoice(index, { label: e.target.value })}
            className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
            data-testid={`select-option-label-${index}`}
          />
          <button
            type="button"
            onClick={() => moveChoice(index, index - 1)}
            disabled={index === 0}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => moveChoice(index, index + 1)}
            disabled={index === choices.length - 1}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeChoice(index)}
            className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove option"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...choices, emptyChoice(choices.length)])}
        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
        data-testid="select-options-add"
      >
        <Plus className="h-3.5 w-3.5" />
        Add option
      </button>
    </div>
  );
}

/** Valid options JSON for create API — exposed for tests. */
export function choicesToOptionsJson(choices: AttributeSelectChoice[]) {
  return buildSelectOptionsPayload(choices.filter((c) => c.label.trim()));
}
