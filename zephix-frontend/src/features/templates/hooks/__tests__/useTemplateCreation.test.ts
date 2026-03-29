import { describe, expect, it } from 'vitest';
import {
  buildTemplateWorkflow,
  isPersistedTemplateId,
} from '../useTemplateCreation';
import type { CanonicalTemplate } from '../../types';
import type { BuiltInTemplateRow } from '../../lib/templateGalleryModel';

function minimalCanonical(
  overrides: Partial<CanonicalTemplate> & Pick<CanonicalTemplate, 'category' | 'complexity'>,
): CanonicalTemplate {
  return {
    id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
    name: 'T',
    description: 'D',
    templateVersion: 1,
    category: overrides.category,
    complexity: overrides.complexity,
    presentationTier: overrides.presentationTier,
    seedPhases: overrides.seedPhases,
    seedTasks: overrides.seedTasks,
    includedViews: ['list'],
    includedFields: [],
    includedStatuses: ['TODO'],
    structureType: 'lightweight',
    defaultImportOptions: {
      includeViews: true,
      includeTasks: true,
      includePhases: true,
      includeMilestones: true,
      includeCustomFields: false,
      includeDependencies: false,
      remapDates: true,
    },
    executionConfiguration: {
      views: ['list'],
      fields: [],
      statuses: ['TODO'],
      structureType: 'lightweight',
      documents: [],
      taskLayout: 'flat',
    },
    governanceConfiguration: {
      capacityPolicy: 'x',
      budgetPolicy: 'x',
      requiredArtifacts: [],
      riskModel: 'x',
      phaseGates: [],
      approvalRules: [],
      auditRequirements: [],
      methodologyMapping: 'x',
    },
  };
}

describe('isPersistedTemplateId', () => {
  it('accepts UUID-shaped ids', () => {
    expect(isPersistedTemplateId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects builtin ids', () => {
    expect(isPersistedTemplateId('builtin-waterfall-pm')).toBe(false);
  });
});

describe('buildTemplateWorkflow', () => {
  it('enables copyPhaseGates when phase count > 2', () => {
    const wf = buildTemplateWorkflow(
      minimalCanonical({
        category: 'Product Management',
        complexity: 'medium',
        seedPhases: [
          { name: 'A', order: 0 },
          { name: 'B', order: 1 },
          { name: 'C', order: 2 },
        ],
      }),
    );
    expect(wf.creation.copyPhaseGates).toBe(true);
    expect(wf.execution.phaseGateRules).toHaveLength(3);
    expect(wf.execution.phaseGateRules[0]?.phaseOrder).toBe(0);
  });

  it('disables copyPhaseGates for two phases outside PM/enterprise', () => {
    const wf = buildTemplateWorkflow(
      minimalCanonical({
        category: 'Product Management',
        complexity: 'low',
        seedPhases: [
          { name: 'A', order: 0 },
          { name: 'B', order: 1 },
        ],
      }),
    );
    expect(wf.creation.copyPhaseGates).toBe(false);
    expect(wf.execution.phaseGateRules).toHaveLength(0);
  });

  it('uses template phase order for rules (built-in)', () => {
    const row: BuiltInTemplateRow = {
      id: 'builtin-simple',
      name: 'S',
      description: 'D',
      category: 'Operations',
      complexity: 'low',
      phases: [
        { name: 'A', order: 0 },
        { name: 'B', order: 1 },
        { name: 'C', order: 2 },
      ],
      taskCount: 1,
      isBuiltIn: true,
    };
    const wf = buildTemplateWorkflow(row);
    expect(wf.creation.copyPhaseGates).toBe(true);
    expect(wf.execution.phaseGateRules.map((r) => r.phaseOrder)).toEqual([0, 1, 2]);
  });
});
