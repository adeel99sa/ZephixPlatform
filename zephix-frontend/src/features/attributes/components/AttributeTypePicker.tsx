import type { AttributeDataType } from '../attributes.types';
import { ATTRIBUTE_TYPE_LABELS, creatableTypesGrouped } from '../attributeTypeGroups';

export type AttributeTypePickerProps = {
  value: AttributeDataType;
  onChange: (type: AttributeDataType) => void;
};

export function AttributeTypePicker({ value, onChange }: AttributeTypePickerProps) {
  const { popular, all } = creatableTypesGrouped();
  const otherTypes = all.filter((t) => !popular.includes(t));

  return (
    <div className="space-y-2" data-testid="attribute-type-picker">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Popular</p>
      <div className="grid grid-cols-2 gap-1">
        {popular.map((type) => (
          <button
            key={type}
            type="button"
            data-testid={`attr-type-${type}`}
            onClick={() => onChange(type)}
            className={`rounded border px-2 py-1.5 text-left text-xs ${
              value === type
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {ATTRIBUTE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">All types</p>
      <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
        {otherTypes.map((type) => (
          <button
            key={type}
            type="button"
            data-testid={`attr-type-${type}`}
            onClick={() => onChange(type)}
            className={`rounded border px-2 py-1.5 text-left text-xs ${
              value === type
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {ATTRIBUTE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
