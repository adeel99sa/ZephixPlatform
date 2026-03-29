import { describe, expect, it } from 'vitest';
import { mapProjectHealthToAtRisk } from '../projects-at-risk-map';

describe('mapProjectHealthToAtRisk', () => {
  it('flags high risk as critical and includes in projects list', () => {
    const out = mapProjectHealthToAtRisk([
      {
        projectId: 'p1',
        projectName: 'Alpha',
        status: 'ACTIVE',
        riskLevel: 'HIGH',
        conflictCount: 0,
      },
      {
        projectId: 'p2',
        projectName: 'Beta',
        status: 'PLANNING',
        riskLevel: 'low',
        conflictCount: 0,
      },
    ]);
    expect(out.totalProjects).toBe(2);
    expect(out.atRiskCount).toBe(1);
    expect(out.projects).toHaveLength(1);
    expect(out.projects[0]?.id).toBe('p1');
    expect(out.projects[0]?.riskLevel).toBe('critical');
  });

  it('treats conflicts as warning when not HIGH', () => {
    const out = mapProjectHealthToAtRisk([
      {
        projectId: 'p1',
        projectName: 'Gamma',
        status: 'ACTIVE',
        riskLevel: 'MEDIUM',
        conflictCount: 2,
      },
    ]);
    expect(out.atRiskCount).toBe(1);
    expect(out.projects[0]?.riskLevel).toBe('warning');
    expect(out.projects[0]?.primaryRisk).toMatch(/conflict/);
  });
});
