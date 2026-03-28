// ─────────────────────────────────────────────────────────────────────────────
// ExplanationBanner — Step 20.5
// ─────────────────────────────────────────────────────────────────────────────

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExplanationBanner } from '../ExplanationBanner';
import type { Explanation } from '../types';
import { CommandActionId } from '@/features/command-palette/commandPalette.api';

const makeExplanation = (
  override: Partial<Explanation> = {},
): Explanation => ({
  id: 'test-1',
  severity: 'info',
  title: 'Test explanation',
  explanation: 'Something happened.',
  suggestedActions: [],
  ...override,
});

describe('ExplanationBanner', () => {
  it('renders nothing when explanations array is empty', () => {
    const { container } = render(<ExplanationBanner explanations={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a single explanation', () => {
    render(
      <ExplanationBanner explanations={[makeExplanation()]} />,
    );
    expect(screen.getByTestId('explanation-banner')).toBeInTheDocument();
    expect(screen.getByText('Test explanation')).toBeInTheDocument();
    expect(screen.getByText('Something happened.')).toBeInTheDocument();
  });

  it('renders severity-based styling (block)', () => {
    render(
      <ExplanationBanner
        explanations={[
          makeExplanation({ id: 'block-1', severity: 'block', title: 'Blocked' }),
        ]}
      />,
    );
    const el = screen.getByTestId('explanation-block-1');
    expect(el).toHaveAttribute('data-severity', 'block');
  });

  it('renders severity-based styling (warn)', () => {
    render(
      <ExplanationBanner
        explanations={[
          makeExplanation({ id: 'warn-1', severity: 'warn', title: 'Warning' }),
        ]}
      />,
    );
    const el = screen.getByTestId('explanation-warn-1');
    expect(el).toHaveAttribute('data-severity', 'warn');
  });

  it('renders suggested actions with action IDs', () => {
    render(
      <ExplanationBanner
        explanations={[
          makeExplanation({
            suggestedActions: [
              {
                actionId: CommandActionId.OPEN_PROJECT_BOARD,
                label: 'View board',
              },
            ],
          }),
        ]}
      />,
    );
    const action = screen.getByTestId(
      `explanation-action-${CommandActionId.OPEN_PROJECT_BOARD}`,
    );
    expect(action).toBeInTheDocument();
    expect(action).toHaveTextContent('View board');
  });

  it('respects maxVisible limit', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      makeExplanation({ id: `exp-${i}`, title: `Explanation ${i}` }),
    );
    render(<ExplanationBanner explanations={many} maxVisible={3} />);
    expect(screen.getByText('+5 more explanations')).toBeInTheDocument();
  });

  it('renders multiple explanations in order', () => {
    render(
      <ExplanationBanner
        explanations={[
          makeExplanation({ id: 'first', title: 'First' }),
          makeExplanation({ id: 'second', title: 'Second' }),
        ]}
      />,
    );
    expect(screen.getByTestId('explanation-first')).toBeInTheDocument();
    expect(screen.getByTestId('explanation-second')).toBeInTheDocument();
  });
});
