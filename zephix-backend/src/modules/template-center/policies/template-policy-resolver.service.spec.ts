import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TemplatePolicyResolverService } from './template-policy-resolver.service';

describe('TemplatePolicyResolverService', () => {
  let service: TemplatePolicyResolverService;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatePolicyResolverService,
        {
          provide: DataSource,
          useValue: { query: queryMock },
        },
      ],
    }).compile();
    service = module.get(TemplatePolicyResolverService);
  });

  it('returns empty requirements when gate exists but requirements missing (approve allowed)', async () => {
    queryMock.mockResolvedValue([
      {
        template_version: 1,
        schema: {
          templateKey: 'waterfall_standard',
          gates: {
            gate_planning_approval: {},
          },
        },
      },
    ]);
    const req = await service.getGateRequirements('project-id', 'gate_planning_approval');
    expect(req.requiredDocKeys).toEqual([]);
    expect(req.requiredKpiKeys).toEqual([]);
    expect(req.templateKey).toBe('waterfall_standard');
  });

  it('throws 404 when gate key not in schema', async () => {
    queryMock.mockResolvedValue([
      {
        template_version: 1,
        schema: {
          templateKey: 'waterfall_standard',
          gates: { gate_planning_approval: { requirements: {} } },
        },
      },
    ]);
    await expect(
      service.getGateRequirements('project-id', 'unknown_gate_key'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 500 when schema is malformed', async () => {
    queryMock.mockResolvedValue([{ template_version: 1, schema: 'not-an-object' }]);
    await expect(
      service.getGateRequirements('project-id', 'any_gate'),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
