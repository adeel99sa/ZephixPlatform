import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AddCardModal } from '../AddCardModal';

describe('AddCardModal (Pass 3)', () => {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  it('renders when open', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    expect(screen.getByTestId('add-card-modal')).toBeInTheDocument();
    expect(screen.getByText('Add Card')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AddCardModal open={false} onClose={onClose} onSelect={onSelect} />);
    expect(screen.queryByTestId('add-card-modal')).not.toBeInTheDocument();
  });

  it('shows Zephix-labeled categories (not raw backend names)', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    // Analytics relabeled to "Project Health"
    const analyticsTab = screen.getByTestId('card-category-analytics');
    expect(analyticsTab).toBeInTheDocument();
    expect(analyticsTab.textContent).toBe('Project Health');
    // Resources kept as-is
    expect(screen.getByTestId('card-category-resources')).toBeInTheDocument();
  });

  it('hides Portfolio category (feature-flagged, not Zephix-ready)', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    expect(screen.queryByTestId('card-category-portfolio')).not.toBeInTheDocument();
    // Portfolio widget tiles should also be hidden
    expect(screen.queryByTestId('card-tile-portfolio_summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-tile-program_summary')).not.toBeInTheDocument();
  });

  it('shows real widget tiles with descriptions', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    const tile = screen.getByTestId('card-tile-project_health');
    expect(tile).toBeInTheDocument();
    expect(tile.textContent).toContain('Project Health');
    expect(tile.textContent).toContain('Shows project health metrics and status');
  });

  it('calls onSelect when tile is clicked', async () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('card-tile-project_health'));
    expect(onSelect).toHaveBeenCalledWith('project_health');
  });

  it('close button calls onClose', async () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('add-card-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('has no placeholder or fake content', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });
});
