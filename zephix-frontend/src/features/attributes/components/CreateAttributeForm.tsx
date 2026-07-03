import { useState, type FormEvent } from 'react';

import { Select } from '@/components/ui/form/Select';
import { Input } from '@/components/ui/input/Input';
import { Checkbox } from '@/components/ui/form/Checkbox';

import { createAttributeDefinition } from '../attributes.api';
import { mapAttributeApiError } from '../mapAttributeApiError';
import {
  ATTRIBUTE_CREATABLE_DATA_TYPES,
  isSelectDataType,
  type AttributeDataType,
  type AttributeDefinition,
  type AttributeScope,
} from '../attributes.types';

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
  const [optionsText, setOptionsText] = useState('');
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
      const opts = optionsText
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      if (opts.length === 0) errors.options = 'At least one option is required for select fields.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const options = needsOptions
      ? optionsText
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

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
      setOptionsText('');
      setRequired(false);
      setLocked(false);
      setScope('WORKSPACE');
      setDataType('text');
      setFieldErrors({});
    } catch (err) {
      setSubmitError(mapAttributeApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const dataTypeOptions = ATTRIBUTE_CREATABLE_DATA_TYPES.map((t) => ({
    value: t,
    label: t.replace(/_/g, ' '),
  }));

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
      <Select
        label="Data type"
        options={dataTypeOptions}
        value={dataType}
        onChange={(e) => setDataType(e.target.value as AttributeDataType)}
        data-testid="attr-create-data-type"
      />
      {needsOptions ? (
        <div className="space-y-1">
          <label htmlFor="attr-options" className="text-sm font-medium">
            Options (one per line)
          </label>
          <textarea
            id="attr-options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
            data-testid="attr-create-options"
          />
          {fieldErrors.options ? (
            <p className="text-sm text-destructive" role="alert">
              {fieldErrors.options}
            </p>
          ) : null}
        </div>
      ) : null}
      <Checkbox
        label="Required"
        checked={required}
        onChange={(e) => setRequired(e.target.checked)}
        data-testid="attr-create-required"
      />
      {isAdmin ? (
        <>
          <Select
            label="Scope"
            options={[
              { value: 'WORKSPACE', label: 'Workspace' },
              { value: 'ORG', label: 'Organization' },
            ]}
            value={scope}
            onChange={(e) => setScope(e.target.value as AttributeScope)}
            data-testid="attr-create-scope"
          />
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
