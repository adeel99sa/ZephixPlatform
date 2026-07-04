import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AttributeCell } from '../components/AttributeCell';
import type { AttributeDefinition } from '../attributes.types';

const numberDef: AttributeDefinition = {
  id: 'attr-num',
  organizationId: null,
  scope: 'WORKSPACE',
  workspaceId: 'ws-1',
  key: 'hours',
  label: 'Hours',
  dataType: 'number',
  locked: false,
  required: false,
  isActive: true,
  defaultValue: null,
  options: null,
};

describe('AttributeCell', () => {
  it('shows em-dash for empty value', () => {
    render(
      <AttributeCell
        definition={numberDef}
        value={null}
        canEdit
        isEditing={false}
        onStartEdit={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('surfaces inline type-mismatch error in display mode', () => {
    render(
      <AttributeCell
        definition={numberDef}
        value={8}
        canEdit
        isEditing={false}
        error="Value does not match the attribute type."
        onStartEdit={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('attr-cell-inline-error')).toHaveTextContent(
      'Value does not match the attribute type.',
    );
  });

  it('enters edit mode on double-click when editable', async () => {
    const user = userEvent.setup();
    const onStartEdit = vi.fn();
    render(
      <AttributeCell
        definition={numberDef}
        value={4}
        canEdit
        isEditing={false}
        onStartEdit={onStartEdit}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.dblClick(screen.getByTestId('attr-cell-display-attr-num'));
    expect(onStartEdit).toHaveBeenCalled();
  });
});
