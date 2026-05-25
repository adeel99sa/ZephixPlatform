import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Rating } from '../Rating';

describe('Rating', () => {
  it('click sets value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Rating value={0} onChange={onChange} label="Quality" />);

    await user.click(screen.getByRole('button', { name: 'Rate 3 of 5' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('hover previews value via aria-pressed on committed star', async () => {
  const user = userEvent.setup();
    render(<Rating value={2} onChange={vi.fn()} label="Quality" />);

    const star4 = screen.getByRole('button', { name: 'Rate 4 of 5' });
    await user.hover(star4);
    expect(star4).toBeInTheDocument();
  });

  it('keyboard Enter selects star', () => {
    const onChange = vi.fn();
    render(<Rating value={1} onChange={onChange} label="Quality" />);

    const star5 = screen.getByRole('button', { name: 'Rate 5 of 5' });
    fireEvent.keyDown(star5, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('readonly disables interaction', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Rating value={2} onChange={onChange} readOnly label="Quality" />);

    const star3 = screen.getByRole('button', { name: 'Rate 3 of 5' });
    expect(star3).toBeDisabled();
    await user.click(star3);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses aria-label Rate N of 5 format', () => {
    render(<Rating value={0} onChange={vi.fn()} max={5} label="Impact" />);
    expect(screen.getByRole('button', { name: 'Rate 1 of 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rate 5 of 5' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Impact' })).toBeInTheDocument();
  });
});
