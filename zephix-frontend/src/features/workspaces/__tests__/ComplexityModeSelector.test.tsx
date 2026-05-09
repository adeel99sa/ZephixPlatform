import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ComplexityModeSelector } from '@/features/workspaces/components/ComplexityModeSelector';

describe('ComplexityModeSelector', () => {
  it('renders three options', () => {
    const onChange = vi.fn();
    render(<ComplexityModeSelector value="lean" onChange={onChange} />);
    expect(screen.getByTestId('complexity-mode-lean')).toBeInTheDocument();
    expect(screen.getByTestId('complexity-mode-standard')).toBeInTheDocument();
    expect(screen.getByTestId('complexity-mode-governed')).toBeInTheDocument();
  });

  it('calls onChange when selecting another mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ComplexityModeSelector value="lean" onChange={onChange} />);
    await user.click(screen.getByTestId('complexity-mode-governed'));
    expect(onChange).toHaveBeenCalledWith('governed');
  });

  it('respects disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ComplexityModeSelector value="lean" onChange={onChange} disabled />);
    await user.click(screen.getByTestId('complexity-mode-standard'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
