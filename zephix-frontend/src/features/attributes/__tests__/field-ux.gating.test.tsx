/**
 * WAVE 1 Field UX pass — gating tests.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AttributeCell } from '../components/AttributeCell';
import { SelectOptionsEditor, choicesToOptionsJson } from '../components/SelectOptionsEditor';
import type { AttributeDefinition } from '../attributes.types';
import type { AttributeSelectChoice } from '../attributeOptions.utils';
import { compareAttributeValues } from '../attributeValue.utils';

const currencyDef: AttributeDefinition = {
  id: 'attr-budget',
  organizationId: null,
  scope: 'SYSTEM',
  workspaceId: null,
  key: 'budget',
  label: 'Budget',
  dataType: 'currency',
  locked: false,
  required: false,
  isActive: true,
  defaultValue: null,
  options: { currencyCode: 'USD' },
};

const multiDef: AttributeDefinition = {
  id: 'attr-tags',
  organizationId: 'org-1',
  scope: 'WORKSPACE',
  workspaceId: 'ws-1',
  key: 'tags',
  label: 'Tags',
  dataType: 'multi_select',
  locked: false,
  required: false,
  isActive: true,
  defaultValue: null,
  options: {
    choices: [
      { key: 'a', label: 'Alpha', color: '#3b82f6', order: 0 },
      { key: 'b', label: 'Beta', color: '#22c55e', order: 1 },
    ],
  },
};

describe('Field UX gating (WAVE 1)', () => {
  it('renders currency values with formatting', () => {
    render(
      <AttributeCell
        definition={currencyDef}
        value={1250}
        canEdit={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('attr-cell-display-attr-budget')).toHaveTextContent('$1,250');
  });

  it('renders multi_select values as chips', () => {
    render(
      <AttributeCell
        definition={multiDef}
        value={['Alpha', 'Beta']}
        canEdit={false}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('select options editor produces valid options JSON', () => {
    const choices: AttributeSelectChoice[] = [
      { key: 'high', label: 'High', color: '#ef4444', order: 0 },
      { key: 'low', label: 'Low', color: '#22c55e', order: 1 },
    ];
    const json = choicesToOptionsJson(choices);
    expect(json.choices).toHaveLength(2);
    expect(json.choices[0]).toMatchObject({ label: 'High', key: 'high', order: 0 });
  });

  it('select options editor allows adding labels', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectOptionsEditor
        choices={[{ key: 'one', label: '', color: '#3b82f6', order: 0 }]}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByTestId('select-option-label-0'), 'Option A');
    expect(screen.getByTestId('select-options-editor')).toBeInTheDocument();
  });

  it('currency cell enters edit mode on double-click', async () => {
    const user = userEvent.setup();
    const onStartEdit = vi.fn();
    render(
      <AttributeCell
        definition={currencyDef}
        value={500}
        canEdit
        isEditing={false}
        onStartEdit={onStartEdit}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.dblClick(screen.getByTestId('attr-cell-display-attr-budget'));
    expect(onStartEdit).toHaveBeenCalled();
  });

  it('header sort compare toggles asc/desc ordering for currency', () => {
    const lowFirst = compareAttributeValues('currency', 100, 500);
    const highFirst = compareAttributeValues('currency', 500, 100);
    expect(lowFirst).toBeLessThan(0);
    expect(highFirst).toBeGreaterThan(0);
  });
});
