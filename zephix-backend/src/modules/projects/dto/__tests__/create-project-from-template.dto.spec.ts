import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProjectFromTemplateDto } from '../create-project-from-template.dto';

describe('CreateProjectFromTemplateDto', () => {
  const base = {
    templateId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    workspaceId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4c58',
    projectName: 'P',
    importOptions: {
      includeViews: true,
      includeTasks: true,
      includePhases: true,
      includeMilestones: true,
      includeCustomFields: false,
      includeDependencies: false,
      remapDates: true,
    },
  };

  it('accepts optional nested workflow', () => {
    const dto = plainToInstance(CreateProjectFromTemplateDto, {
      ...base,
      workflow: {
        creation: {
          copyStructure: true,
          copyPhaseGates: true,
          copyAutomations: false,
          assignDefaultRoles: false,
        },
        execution: {
          phaseGateRules: [
            {
              phaseOrder: 0,
              approverRoles: ['ADMIN'],
              autoLock: true,
              name: 'G1',
            },
          ],
        },
      },
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidUnknownValues: false,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects workflow with invalid phaseGateRules item', () => {
    const dto = plainToInstance(CreateProjectFromTemplateDto, {
      ...base,
      workflow: {
        creation: {
          copyStructure: true,
          copyPhaseGates: true,
          copyAutomations: false,
          assignDefaultRoles: false,
        },
        execution: {
          phaseGateRules: [
            {
              phaseOrder: 'x',
              approverRoles: 'not-array',
              autoLock: true,
            },
          ],
        },
      },
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidUnknownValues: false,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
