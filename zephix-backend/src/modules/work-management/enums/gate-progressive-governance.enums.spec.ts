import { GateReviewState } from './gate-review-state.enum';
import { GateCycleState } from './gate-cycle-state.enum';
import { GateConditionStatus } from './gate-condition-status.enum';

describe('progressive governance gate enums', () => {
  it('GateReviewState has stable defaults', () => {
    expect(GateReviewState.NOT_STARTED).toBe('NOT_STARTED');
    expect(GateReviewState.APPROVED).toBe('APPROVED');
    expect(GateReviewState.LOCKED).toBe('LOCKED');
  });

  it('GateCycleState includes open/closed/recycled', () => {
    expect(GateCycleState.OPEN).toBe('OPEN');
    expect(GateCycleState.CLOSED).toBe('CLOSED');
    expect(GateCycleState.RECYCLED).toBe('RECYCLED');
  });

  it('GateConditionStatus covers pending/satisfied/waived', () => {
    expect(GateConditionStatus.PENDING).toBe('PENDING');
    expect(GateConditionStatus.SATISFIED).toBe('SATISFIED');
    expect(GateConditionStatus.WAIVED).toBe('WAIVED');
  });
});
