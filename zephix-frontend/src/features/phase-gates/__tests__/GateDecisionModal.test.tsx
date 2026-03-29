import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GateDecisionModal } from '../GateDecisionModal';

vi.mock('@/features/work-management/hooks/useExecuteGateDecision', () => ({
  useExecuteGateDecision: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('GateDecisionModal', () => {
  it('renders title and phase context', () => {
    render(
      <GateDecisionModal
        isOpen
        onClose={() => {}}
        projectId="p1"
        gateDefinitionId="g1"
        gateName="Planning gate"
        phaseName="Alpha"
        nextPhaseOptions={[{ id: 'ph2', name: 'Beta' }]}
      />,
    );
    expect(screen.getByRole('heading', { name: /Gate decision/i })).toBeInTheDocument();
    expect(screen.getByText(/Alpha · Planning gate/)).toBeInTheDocument();
  });
});
