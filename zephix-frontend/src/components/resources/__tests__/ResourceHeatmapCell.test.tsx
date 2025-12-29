import { render, screen } from '@testing-library/react';
import { ResourceHeatmapCell } from '../ResourceHeatmapCell';
import type { HeatmapCell } from '@/types/resourceTimeline';

describe('ResourceHeatmapCell', () => {
  it('should render empty cell when cell is null', () => {
    render(<ResourceHeatmapCell cell={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should render NONE classification with safe styling', () => {
    const cell: HeatmapCell = {
      resourceId: 'resource-1',
      date: '2025-01-15',
      capacityPercent: 100,
      hardLoadPercent: 50,
      softLoadPercent: 0,
      classification: 'NONE',
    };

    render(<ResourceHeatmapCell cell={cell} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    const cellElement = screen.getByText('50%').closest('td');
    expect(cellElement).toHaveClass('bg-availability-none');
  });

  it('should render WARNING classification with warning styling', () => {
    const cell: HeatmapCell = {
      resourceId: 'resource-1',
      date: '2025-01-15',
      capacityPercent: 100,
      hardLoadPercent: 50,
      softLoadPercent: 40,
      classification: 'WARNING',
    };

    render(<ResourceHeatmapCell cell={cell} />);
    expect(screen.getByText('50H/40S')).toBeInTheDocument();
    const cellElement = screen.getByText('50H/40S').closest('td');
    expect(cellElement).toHaveClass('bg-availability-warning');
  });

  it('should render CRITICAL classification with critical styling', () => {
    const cell: HeatmapCell = {
      resourceId: 'resource-1',
      date: '2025-01-15',
      capacityPercent: 100,
      hardLoadPercent: 120,
      softLoadPercent: 0,
      classification: 'CRITICAL',
    };

    render(<ResourceHeatmapCell cell={cell} />);
    expect(screen.getByText('120%')).toBeInTheDocument();
    const cellElement = screen.getByText('120%').closest('td');
    expect(cellElement).toHaveClass('bg-availability-critical');
  });

  it('should show tooltip on hover', () => {
    const cell: HeatmapCell = {
      resourceId: 'resource-1',
      date: '2025-01-15',
      capacityPercent: 100,
      hardLoadPercent: 80,
      softLoadPercent: 20,
      classification: 'WARNING',
    };

    render(<ResourceHeatmapCell cell={cell} />);
    const cellElement = screen.getByText('80H/20S').closest('td');
    expect(cellElement).toHaveAttribute('title');
  });
});





