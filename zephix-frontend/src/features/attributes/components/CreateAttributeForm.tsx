import { useState, type FormEvent } from 'react';

import { Input } from '@/components/ui/input/Input';
import { Checkbox } from '@/components/ui/form/Checkbox';

import { createAttributeDefinition } from '../attributes.api';
import { mapAttributeApiError } from '../mapAttributeApiError';
import {
  buildCreateOptionsPayload,
  type AttributeSelectChoice,
} from '../attributeOptions.utils';
import {
  isSelectDataType,
  type AttributeDataType,
  type AttributeDefinition,
  type AttributeScope,
} from '../attributes.types';
import { AttributeTypePicker } from './AttributeTypePicker';
import { SelectOptionsEditor } from './SelectOptionsEditor';

function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export type CreateAttributeFormProps = {
  workspaceId: string;
  isAdmin: boolean;
  onCreated: (definition: AttributeDefinition) => void;
};

export function CreateAttributeForm({ workspaceId, isAdmin, onCreated }: CreateAttributeFormProps) {
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [dataType, setDataType] = useState<AttributeDataType>('text');
  const [required, setRequired] = useState(false);
  const [scope, setScope] = useState<AttributeScope>('WORKSPACE');
  const [locked, setLocked] = useState(false);
  const [selectChoices, setSelectChoices] = useState<AttributeSelectChoice[]>([
    { key: 'option_1', label: '', color: '#3b82f6', order: 0 },
  ]);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const needsOptions = isSelectDataType(dataType);

  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (!keyTouched) setKey(slugifyLabel(value));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!label.trim()) errors.label = 'Label is required.';
    if (!key.trim()) errors.key = 'Key is required.';
    if (needsOptions) {
      const valid = selectChoices.filter((c) => c.label.trim());
      if (valid.length === 0) errors.options = 'At least one option is required for select fields.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const options = buildCreateOptionsPayload(
      dataType,
      selectChoices.filter((c) => c.label.trim()),
      { currencyCode, durationUnit },
    );

    setSubmitting(true);
    try {
      const created = await createAttributeDefinition(
        {
          key: key.trim(),
          label: label.trim(),
          dataType,
          required,
          options,
          scope: isAdmin ? scope : 'WORKSPACE',
          locked: isAdmin ? locked : undefined,
        },
        workspaceId,
      );
      onCreated(created);
      setLabel('');
      setKey('');
      setKeyTouched(false);
      setSelectChoices([{ key: 'option_1', label: '', color: '#3b82f6', order: 0 }]);
      setRequired(false);
      setLocked(false);
      setScope('WORKSPACE');
      setDataType('text');
      setCurrencyCode('USD');
      setDurationUnit('hours');
      setFieldErrors({});
    } catch (err) {
      setSubmitError(mapAttributeApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="create-attribute-form">
      <Input
        label="Label"
        value={label}
        onChange={(e) => handleLabelChange(e.target.value)}
        error={fieldErrors.label}
        data-testid="attr-create-label"
      />
      <Input
        label="Key"
        value={key}
        onChange={(e) => {
          setKeyTouched(true);
          setKey(e.target.value);
        }}
        error={fieldErrors.key}
        data-testid="attr-create-key"
      />

      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Data type</span>
        <AttributeTypePicker value={dataType} onChange={setDataType} />
      </div>

      {needsOptions ? (
        <div className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Options</span>
          <SelectOptionsEditor choices={selectChoices} onChange={setSelectChoices} />
          {fieldErrors.options ? (
            <p className="text-sm text-destructive" role="alert" data-testid="attr-create-options-error">
              {fieldErrors.options}
            </p>
          ) : null}
        </div>
      ) : null}

      {dataType === 'currency' ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600" data-testid="attr-create-currency-hint">
          <label className="flex items-center gap-2">
            <span>Currency</span>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="rounded border border-slate-200 px-1 py-0.5 text-xs"
              data-testid="attr-create-currency-code"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </label>
        </div>
      ) : null}

      {dataType === 'duration' ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600" data-testid="attr-create-duration-hint">
          <label className="flex items-center gap-2">
            <span>Unit</span>
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'hours' | 'days')}
              className="rounded border border-slate-200 px-1 py-0.5 text-xs"
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </label>
        </div>
      ) : null}

      {dataType === 'rating' ? (
        <p className="text-xs text-slate-500" data-testid="attr-create-rating-hint">
          Rating scale: 1–5 stars
        </p>
      ) : null}

      <Checkbox
        label="Required"
        checked={required}
        onChange={(e) => setRequired(e.target.checked)}
        data-testid="attr-create-required"
      />
      {isAdmin ? (
        <>
          <div className="space-y-1">
            <label htmlFor="attr-create-scope" className="text-sm font-medium">
              Scope
            </label>
            <select
              id="attr-create-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as AttributeScope)}
              className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
              data-testid="attr-create-scope"
            >
              <option value="WORKSPACE">Workspace</option>
              <option value="ORG">Organization</option>
            </select>
          </div>
          <Checkbox
            label="Lock on template"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
            data-testid="attr-create-locked"
          />
        </>
      ) : null}
      {submitError ? (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        data-testid="attr-create-submit"
      >
        {submitting ? 'Creating…' : 'Create field'}
      </button>
    </form>
  );
}
