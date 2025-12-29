import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from './tenant-aware.repository';
import { Project } from '../projects/entities/project.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('TenantContextService - runWithTenant', () => {
  let service: TenantContextService;
  let mockDataSource: Partial<DataSource>;
  let mockRepository: any;

  beforeEach(async () => {
    // Mock repository
    mockRepository = {
      find: jest.fn(),
      metadata: {
        name: 'project',
        columns: [
          { propertyName: 'organizationId', databaseName: 'organization_id' },
        ],
      },
    };

    // Mock DataSource
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  it('should set tenant context and allow repository access', async () => {
    const testOrgId = 'org-123';
    const testProjects = [
      { id: '1', name: 'Project 1', organizationId: testOrgId },
      { id: '2', name: 'Project 2', organizationId: testOrgId },
    ];

    mockRepository.find.mockResolvedValue(testProjects);

    // Create tenant-aware repository
    const tenantAwareRepo = new TenantAwareRepository<Project>(
      mockRepository,
      service,
      Project,
    );

    // Execute within tenant context
    const result = await service.runWithTenant(
      { organizationId: testOrgId },
      async () => {
        // Verify context is set
        expect(service.getOrganizationId()).toBe(testOrgId);

        // Use tenant-aware repository
        const projects = await tenantAwareRepo.find({});

        // Verify repository was called (scoping happens in TenantAwareRepository)
        expect(mockRepository.find).toHaveBeenCalled();

        return projects;
      },
    );

    // Verify results
    expect(result).toEqual(testProjects);
    expect(result.every((p: any) => p.organizationId === testOrgId)).toBe(true);
  });

  it('should throw error when organizationId missing in context', async () => {
    const tenantAwareRepo = new TenantAwareRepository<Project>(
      mockRepository,
      service,
      Project,
    );

    // Try to use repository without tenant context
    await expect(
      tenantAwareRepo.find({}),
    ).rejects.toThrow(/Tenant context missing.*organizationId/);
  });

  it('should isolate contexts between parallel executions', async () => {
    const orgA = 'org-a';
    const orgB = 'org-b';

    const projectsA = [
      { id: '1', name: 'Project A1', organizationId: orgA },
    ];
    const projectsB = [
      { id: '2', name: 'Project B1', organizationId: orgB },
    ];

    mockRepository.find
      .mockResolvedValueOnce(projectsA)
      .mockResolvedValueOnce(projectsB);

    const tenantAwareRepo = new TenantAwareRepository<Project>(
      mockRepository,
      service,
      Project,
    );

    // Execute two parallel tenant contexts
    const [resultA, resultB] = await Promise.all([
      service.runWithTenant({ organizationId: orgA }, async () => {
        expect(service.getOrganizationId()).toBe(orgA);
        return tenantAwareRepo.find({});
      }),
      service.runWithTenant({ organizationId: orgB }, async () => {
        expect(service.getOrganizationId()).toBe(orgB);
        return tenantAwareRepo.find({});
      }),
    ]);

    // Verify each result belongs to its org
    expect(resultA[0].organizationId).toBe(orgA);
    expect(resultB[0].organizationId).toBe(orgB);
    expect(resultA[0].id).not.toBe(resultB[0].id);
  });

  it('should support workspaceId in context', async () => {
    const orgId = 'org-123';
    const workspaceId = 'ws-456';

    await service.runWithTenant(
      { organizationId: orgId, workspaceId },
      async () => {
        expect(service.getOrganizationId()).toBe(orgId);
        expect(service.getWorkspaceId()).toBe(workspaceId);
      },
    );
  });
});


