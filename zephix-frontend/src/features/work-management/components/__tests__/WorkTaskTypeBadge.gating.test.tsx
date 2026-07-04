import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WorkTaskTypeBadge } from '../WorkTaskTypeBadge';

describe('WorkTaskTypeBadge (WAVE 1 Track B)', () => {
  it('renders STORY badge with correct test id and label', () => {
    render(<WorkTaskTypeBadge type="STORY" />);
    const badge = screen.getByTestId('work-task-type-badge-STORY');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('STORY');
    expect(badge.className).toMatch(/bg-blue-100/);
  });

  it('renders SPIKE badge with correct test id and label', () => {
    render(<WorkTaskTypeBadge type="SPIKE" />);
    const badge = screen.getByTestId('work-task-type-badge-SPIKE');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('SPIKE');
    expect(badge.className).toMatch(/bg-violet-100/);
  });

  it('renders existing EPIC badge pattern unchanged', () => {
    render(<WorkTaskTypeBadge type="EPIC" />);
    expect(screen.getByTestId('work-task-type-badge-EPIC')).toHaveTextContent('EPIC');
  });
});
