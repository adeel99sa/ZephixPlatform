import { describe, expect, it } from 'vitest';
import { getUiGroup } from '../categoryMapping';
import type { CanonicalTemplate } from '../../types';
import type { BuiltInTemplateRow } from '../templateGalleryModel';

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
    isCustom: overrides.isCustom,
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

describe('getUiGroup', () => {
  it('returns custom for org templates', () => {
    expect(
      getUiGroup(
        minimalCanonical({
          category: 'Operations',
          complexity: 'low',
          isCustom: true,
        }),
      ),
    ).toBe('custom');
  });

  it('returns quick-start for simple tier', () => {
    expect(
      getUiGroup(
        minimalCanonical({
          category: 'Project Management',
          complexity: 'high',
          presentationTier: 'simple',
          seedPhases: [{ name: 'A', order: 0 }, { name: 'B', order: 1 }, { name: 'C', order: 2 }],
        }),
      ),
    ).toBe('quick-start');
  });

  it('returns methodology for Project Management with enough phases', () => {
    expect(
      getUiGroup(
        minimalCanonical({
          category: 'Project Management',
          complexity: 'medium',
          seedPhases: [
            { name: 'A', order: 0 },
            { name: 'B', order: 1 },
            { name: 'C', order: 2 },
          ],
        }),
      ),
    ).toBe('methodology');
  });

  it('returns by-use-case for non-methodology categories', () => {
    expect(
      getUiGroup(
        minimalCanonical({
          category: 'Product Management',
          complexity: 'medium',
          seedPhases: [
            { name: 'A', order: 0 },
            { name: 'B', order: 1 },
            { name: 'C', order: 2 },
          ],
        }),
      ),
    ).toBe('by-use-case');
  });

  it('classifies built-in rows', () => {
    const row: BuiltInTemplateRow = {
      id: 'builtin-x',
      name: 'X',
      description: 'D',
      category: 'Project Management',
      complexity: 'high',
      phases: [{ name: 'a', order: 0 }, { name: 'b', order: 1 }, { name: 'c', order: 2 }],
      taskCount: 10,
      isBuiltIn: true,
    };
    expect(getUiGroup(row)).toBe('methodology');
  });
});
