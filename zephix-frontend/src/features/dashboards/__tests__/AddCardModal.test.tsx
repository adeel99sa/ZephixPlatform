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

  it('shows real widget categories from registry', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    expect(screen.getByTestId('card-category-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('card-category-resources')).toBeInTheDocument();
  });

  it('shows real widget tiles with descriptions', () => {
    render(<AddCardModal open={true} onClose={onClose} onSelect={onSelect} />);
    expect(screen.getByTestId('card-tile-project_health')).toBeInTheDocument();
    expect(screen.getByText('Project Health')).toBeInTheDocument();
    expect(screen.getByText('Shows project health metrics and status')).toBeInTheDocument();
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
