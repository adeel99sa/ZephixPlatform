import { describe, expect, it } from 'vitest';

import { isProjectShellTabKeyRemovable } from '../project-shell-tabs';
import { ProjectGovernanceLevel } from '../../types';

describe('isProjectShellTabKeyRemovable', () => {
  it('never allows removing overview or tasks', () => {
    expect(isProjectShellTabKeyRemovable('overview', undefined)).toBe(false);
    expect(isProjectShellTabKeyRemovable('tasks', ProjectGovernanceLevel.EXECUTION)).toBe(
      false,
    );
    expect(isProjectShellTabKeyRemovable('tasks', ProjectGovernanceLevel.GOVERNED)).toBe(
      false,
    );
  });

  it('allows removing optional tabs under EXECUTION', () => {
    expect(isProjectShellTabKeyRemovable('plan', ProjectGovernanceLevel.EXECUTION)).toBe(
      true,
    );
    expect(isProjectShellTabKeyRemovable('documents', ProjectGovernanceLevel.EXECUTION)).toBe(
      true,
    );
    expect(isProjectShellTabKeyRemovable('raid', ProjectGovernanceLevel.EXECUTION)).toBe(
      true,
    );
  });

  it('disallows removing documents and raid when GOVERNED', () => {
    expect(isProjectShellTabKeyRemovable('documents', ProjectGovernanceLevel.GOVERNED)).toBe(
      false,
    );
    expect(isProjectShellTabKeyRemovable('raid', ProjectGovernanceLevel.GOVERNED)).toBe(
      false,
    );
    expect(isProjectShellTabKeyRemovable('plan', ProjectGovernanceLevel.GOVERNED)).toBe(true);
  });
});
