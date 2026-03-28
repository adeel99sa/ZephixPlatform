/**
 * Verifies project governance boolean flags are accepted by DTOs.
 *
 * Wave 2 blocker: PATCH /api/projects/:id with { costTrackingEnabled: true }
 * returned VALIDATION_ERROR because the DTO didn't include this field.
 *
 * These flags exist on the Project entity and must be settable via
 * CreateProjectDto (and therefore UpdateProjectDto via PartialType).
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProjectDto } from '../dto/create-project.dto';

describe('Project governance boolean flags in DTO', () => {
  const GOVERNANCE_FLAGS = [
    'costTrackingEnabled',
    'earnedValueEnabled',
    'waterfallEnabled',
    'baselinesEnabled',
    'capacityEnabled',
    'iterationsEnabled',
    'changeManagementEnabled',
  ] as const;

  it('CreateProjectDto accepts all governance boolean flags', async () => {
    const payload: Record<string, any> = {
      name: 'Test Project',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    };
    for (const flag of GOVERNANCE_FLAGS) {
      payload[flag] = true;
    }
    const dto = plainToInstance(CreateProjectDto, payload);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const govErrors = errors.filter((e) =>
      GOVERNANCE_FLAGS.includes(e.property as any),
    );
    expect(govErrors).toHaveLength(0);
  });

  it('costTrackingEnabled accepts true', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: 'EV Project',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      costTrackingEnabled: true,
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const ctErrors = errors.filter((e) => e.property === 'costTrackingEnabled');
    expect(ctErrors).toHaveLength(0);
  });

  it('costTrackingEnabled accepts false', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: 'No-Cost Project',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      costTrackingEnabled: false,
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const ctErrors = errors.filter((e) => e.property === 'costTrackingEnabled');
    expect(ctErrors).toHaveLength(0);
  });

  it('earnedValueEnabled accepts true', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: 'EV Project',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      earnedValueEnabled: true,
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const evErrors = errors.filter((e) => e.property === 'earnedValueEnabled');
    expect(evErrors).toHaveLength(0);
  });

  it('governance flags are optional (not required)', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: 'Minimal Project',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const govErrors = errors.filter((e) =>
      GOVERNANCE_FLAGS.includes(e.property as any),
    );
    expect(govErrors).toHaveLength(0);
  });

  it('non-boolean value for governance flag is rejected', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: 'Bad Flag Project',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      costTrackingEnabled: 'yes',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const ctErrors = errors.filter((e) => e.property === 'costTrackingEnabled');
    expect(ctErrors.length).toBeGreaterThan(0);
  });
});
