import type { CustomFieldDefinition } from '@/api/project-artifacts.types';
import { Rating } from '@/components/ui/Rating';

export type CustomFieldRendererProps = {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  readOnly?: boolean;
};

export function CustomFieldRenderer({
  definition,
  value,
  onChange,
  readOnly = false,
}: CustomFieldRendererProps) {
  const id = `artifact-cf-${definition.id}`;
  const label = (
    <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
      {definition.name}
      {definition.required ? <span className="text-red-500"> *</span> : null}
    </label>
  );

  switch (definition.type) {
    case 'text':
      return (
        <div>
          {label}
          <textarea
            id={id}
            rows={3}
            readOnly={readOnly}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(definition.id, e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </div>
      );
    case 'number':
    case 'currency':
      return (
        <div>
          {label}
          <input
            id={id}
            type="number"
            readOnly={readOnly}
            value={typeof value === 'number' ? value : value === '' ? '' : Number(value) || ''}
            onChange={(e) => {
              const n = e.target.value === '' ? null : Number(e.target.value);
              onChange(definition.id, n);
            }}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </div>
      );
    case 'date':
      return (
        <div>
          {label}
          <input
            id={id}
            type="date"
            readOnly={readOnly}
            value={typeof value === 'string' ? value.slice(0, 10) : ''}
            onChange={(e) => onChange(definition.id, e.target.value || null)}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </div>
      );
    case 'enum': {
      const options = definition.enumValues ?? [];
      return (
        <div>
          {label}
          <select
            id={id}
            disabled={readOnly}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(definition.id, e.target.value || null)}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          >
            <option value="">Select…</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case 'person':
      return (
        <div>
          {label}
          <input
            id={id}
            type="text"
            readOnly={readOnly}
            placeholder="User ID or email"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(definition.id, e.target.value || null)}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </div>
      );
    case 'rating':
      return (
        <div>
          {label}
          <Rating
            value={typeof value === 'number' ? value : Number(value) || 0}
            onChange={(n) => onChange(definition.id, n)}
            readOnly={readOnly}
            label={definition.name}
          />
        </div>
      );
    default:
      return null;
  }
}
