import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CustomFieldDefinition } from '@/api/project-artifacts.types';
import { ArtifactFieldProvider } from '@/features/artifacts/context/ArtifactFieldContext';

import { CustomFieldRenderer } from '../CustomFieldRenderer';

function def(partial: Partial<CustomFieldDefinition> & Pick<CustomFieldDefinition, 'type'>): CustomFieldDefinition {
  return {
    id: 'field-1',
    name: 'Field',
    required: false,
    ...partial,
  };
}

function renderField(
  definition: CustomFieldDefinition,
  props: Partial<ComponentProps<typeof CustomFieldRenderer>> = {},
) {
  const onChange = props.onChange ?? vi.fn();
  return render(
    <ArtifactFieldProvider
      value={{
        assigneeOptions: [{ id: 'user-1', name: 'Alex Member', email: 'alex@test.com' }],
        currentUserId: 'user-1',
      }}
    >
      <CustomFieldRenderer
        definition={definition}
        value={props.value ?? ''}
        onChange={onChange}
        disabled={props.disabled}
        error={props.error}
      />
    </ArtifactFieldProvider>,
  );
}

describe('CustomFieldRenderer', () => {
  it('renders Textarea for text type', () => {
    renderField(def({ type: 'text' }), { value: 'hello' });
    expect(screen.getByLabelText('Field')).toBeInTheDocument();
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
  });

  it('renders number input for number type', () => {
    renderField(def({ type: 'number', name: 'Count' }), { value: 42 });
    const input = screen.getByLabelText('Count');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveValue(42);
  });

  it('renders date picker for date type', () => {
    renderField(def({ type: 'date', name: 'Due' }), { value: '2026-05-24' });
    expect(screen.getByLabelText('Due')).toHaveAttribute('type', 'date');
  });

  it('renders enum select with enumValues', () => {
    renderField(
      def({ type: 'enum', name: 'Severity', enumValues: ['Low', 'High'] }),
      { value: 'Low' },
    );
    expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument();
  });

  it('renders person assignee control', () => {
    renderField(def({ type: 'person', name: 'Owner' }), { value: 'user-1' });
    expect(screen.getByRole('button', { name: 'Alex Member' })).toBeInTheDocument();
  });

  it('renders Rating for rating type', () => {
    renderField(def({ type: 'rating', name: 'Score' }), { value: 3 });
    expect(screen.getByRole('button', { name: 'Rate 3 of 5' })).toBeInTheDocument();
  });

  it('renders currency input with $ prefix', () => {
    renderField(def({ type: 'currency', name: 'Budget' }), { value: 100 });
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget')).toHaveAttribute('type', 'number');
  });

  it('shows required marker when field.required is true', () => {
    renderField(def({ type: 'text', name: 'Title', required: true }));
    expect(screen.getByLabelText('Title *')).toBeInTheDocument();
  });

  it('renders error with aria-describedby on text field', () => {
    renderField(def({ type: 'text', name: 'Notes' }), { error: 'Required field' });
    const input = screen.getByLabelText('Notes');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('propagates disabled to underlying primitive', () => {
    renderField(def({ type: 'text' }), { disabled: true });
    expect(screen.getByLabelText('Field')).toBeDisabled();
  });

  it('calls onChange when text value changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(def({ type: 'text' }), { onChange, value: '' });
    await user.type(screen.getByLabelText('Field'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
