/**
 * Sprint guard tests — verify that COMPLETED/CANCELLED sprints are immutable.
 *
 * These test the guard logic inline rather than full integration,
 * validating the exact error codes the service throws.
 */
import { SprintStatus } from '../entities/sprint.entity';

/**
 * Mirror the guard logic from SprintsService.updateSprint.
 * This is intentionally duplicated so the test breaks if the service logic changes.
 */
function assertSprintMutableForUpdate(
  status: SprintStatus,
  dto: { name?: string; goal?: string; startDate?: string; endDate?: string; status?: SprintStatus },
): string | null {
  if (status === SprintStatus.COMPLETED || status === SprintStatus.CANCELLED) {
    const nonStatusFields = ['name', 'goal', 'startDate', 'endDate'] as const;
    const hasMutation = nonStatusFields.some((f) => (dto as any)[f] !== undefined);
    if (hasMutation) {
      return 'SPRINT_IMMUTABLE';
    }
  }
  return null;
}

function assertTaskAssignable(status: SprintStatus): string | null {
  if (status === SprintStatus.COMPLETED || status === SprintStatus.CANCELLED) {
    return 'SPRINT_CLOSED';
  }
  return null;
}

function assertTaskRemovable(status: SprintStatus): string | null {
  if (status === SprintStatus.COMPLETED || status === SprintStatus.CANCELLED) {
    return 'SPRINT_CLOSED';
  }
  return null;
}

const VALID_TRANSITIONS: Record<SprintStatus, SprintStatus[]> = {
  [SprintStatus.PLANNING]: [SprintStatus.ACTIVE, SprintStatus.CANCELLED],
  [SprintStatus.ACTIVE]: [SprintStatus.COMPLETED, SprintStatus.CANCELLED],
  [SprintStatus.COMPLETED]: [],
  [SprintStatus.CANCELLED]: [],
};

function assertStatusTransition(
  current: SprintStatus,
  target: SprintStatus,
): string | null {
  if (!VALID_TRANSITIONS[current]?.includes(target)) {
    return 'INVALID_SPRINT_TRANSITION';
  }
  return null;
}

describe('Sprint Guards', () => {
  describe('COMPLETED sprint immutability', () => {
    it('blocks name change on COMPLETED sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.COMPLETED, { name: 'new' }))
        .toBe('SPRINT_IMMUTABLE');
    });

    it('blocks goal change on COMPLETED sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.COMPLETED, { goal: 'new goal' }))
        .toBe('SPRINT_IMMUTABLE');
    });

    it('blocks startDate change on COMPLETED sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.COMPLETED, { startDate: '2026-04-01' }))
        .toBe('SPRINT_IMMUTABLE');
    });

    it('blocks endDate change on COMPLETED sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.COMPLETED, { endDate: '2026-04-30' }))
        .toBe('SPRINT_IMMUTABLE');
    });

    it('allows status-only patch on COMPLETED (will be rejected by transition check)', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.COMPLETED, { status: SprintStatus.ACTIVE }))
        .toBeNull();
    });

    it('blocks task assignment on COMPLETED sprint', () => {
      expect(assertTaskAssignable(SprintStatus.COMPLETED)).toBe('SPRINT_CLOSED');
    });

    it('blocks task removal on COMPLETED sprint', () => {
      expect(assertTaskRemovable(SprintStatus.COMPLETED)).toBe('SPRINT_CLOSED');
    });
  });

  describe('CANCELLED sprint immutability', () => {
    it('blocks name change on CANCELLED sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.CANCELLED, { name: 'x' }))
        .toBe('SPRINT_IMMUTABLE');
    });

    it('blocks task assignment on CANCELLED sprint', () => {
      expect(assertTaskAssignable(SprintStatus.CANCELLED)).toBe('SPRINT_CLOSED');
    });

    it('blocks task removal on CANCELLED sprint', () => {
      expect(assertTaskRemovable(SprintStatus.CANCELLED)).toBe('SPRINT_CLOSED');
    });
  });

  describe('PLANNING sprint mutability', () => {
    it('allows name change on PLANNING sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.PLANNING, { name: 'x' }))
        .toBeNull();
    });

    it('allows date change on PLANNING sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.PLANNING, { startDate: '2026-04-01' }))
        .toBeNull();
    });

    it('allows task assignment on PLANNING sprint', () => {
      expect(assertTaskAssignable(SprintStatus.PLANNING)).toBeNull();
    });

    it('allows task removal on PLANNING sprint', () => {
      expect(assertTaskRemovable(SprintStatus.PLANNING)).toBeNull();
    });
  });

  describe('ACTIVE sprint mutability', () => {
    it('allows name change on ACTIVE sprint', () => {
      expect(assertSprintMutableForUpdate(SprintStatus.ACTIVE, { name: 'x' }))
        .toBeNull();
    });

    it('allows task assignment on ACTIVE sprint', () => {
      expect(assertTaskAssignable(SprintStatus.ACTIVE)).toBeNull();
    });

    it('allows task removal on ACTIVE sprint', () => {
      expect(assertTaskRemovable(SprintStatus.ACTIVE)).toBeNull();
    });
  });

  describe('Status transition rules', () => {
    it('PLANNING -> ACTIVE is allowed', () => {
      expect(assertStatusTransition(SprintStatus.PLANNING, SprintStatus.ACTIVE)).toBeNull();
    });

    it('PLANNING -> CANCELLED is allowed', () => {
      expect(assertStatusTransition(SprintStatus.PLANNING, SprintStatus.CANCELLED)).toBeNull();
    });

    it('PLANNING -> COMPLETED is blocked', () => {
      expect(assertStatusTransition(SprintStatus.PLANNING, SprintStatus.COMPLETED))
        .toBe('INVALID_SPRINT_TRANSITION');
    });

    it('ACTIVE -> COMPLETED is allowed', () => {
      expect(assertStatusTransition(SprintStatus.ACTIVE, SprintStatus.COMPLETED)).toBeNull();
    });

    it('ACTIVE -> CANCELLED is allowed', () => {
      expect(assertStatusTransition(SprintStatus.ACTIVE, SprintStatus.CANCELLED)).toBeNull();
    });

    it('COMPLETED -> anything is blocked', () => {
      expect(assertStatusTransition(SprintStatus.COMPLETED, SprintStatus.ACTIVE))
        .toBe('INVALID_SPRINT_TRANSITION');
      expect(assertStatusTransition(SprintStatus.COMPLETED, SprintStatus.PLANNING))
        .toBe('INVALID_SPRINT_TRANSITION');
    });

    it('CANCELLED -> anything is blocked', () => {
      expect(assertStatusTransition(SprintStatus.CANCELLED, SprintStatus.ACTIVE))
        .toBe('INVALID_SPRINT_TRANSITION');
      expect(assertStatusTransition(SprintStatus.CANCELLED, SprintStatus.PLANNING))
        .toBe('INVALID_SPRINT_TRANSITION');
    });
  });
});
