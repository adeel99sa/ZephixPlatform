import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardPermission } from '../entities/dashboard-permission.entity';
import { DashboardTemplate } from '../entities/dashboard-template.entity';
import { ClaudeService } from '../../ai/claude.service';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { DashboardType, DashboardStatus, DashboardLayout } from '../entities/dashboard.entity';
import { WidgetType, WidgetSize } from '../entities/dashboard-widget.entity';
import { PermissionLevel } from '../entities/dashboard-permission.entity';

describe('DashboardService', () => {
  let service: DashboardService;
  let dashboardRepository: Repository<Dashboard>;
  let widgetRepository: Repository<DashboardWidget>;
  let permissionRepository: Repository<DashboardPermission>;
  let templateRepository: Repository<DashboardTemplate>;
  let claudeService: ClaudeService;

  const mockDashboard: Partial<Dashboard> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Dashboard',
    description: 'Test Description',
    slug: 'test-dashboard',
    type: DashboardType.PERSONAL,
    status: DashboardStatus.ACTIVE,
    layout: DashboardLayout.GRID,
    organizationId: 'org-123',
    createdById: 'user-123',
    tags: ['test'],
    isFeatured: false,
    isPublic: false,
    theme: 'default',
    refreshInterval: 300,
    viewCount: 0,
  };

  const mockWidget: Partial<DashboardWidget> = {
    id: 'widget-123',
    title: 'Test Widget',
    widgetType: WidgetType.KPI_METRIC,
    size: WidgetSize.MEDIUM,
    dashboardId: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockPermission: Partial<DashboardPermission> = {
    id: 'permission-123',
    dashboardId: '123e4567-e89b-12d3-a456-426614174000',
    level: PermissionLevel.OWNER,
    scope: 'user',
    userId: 'user-123',
    grantedById: 'user-123',
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canExport: true,
      canManageUsers: true,
      canManageSettings: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Dashboard),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              setParameters: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getCount: jest.fn(),
              getMany: jest.fn(),
            })),
            increment: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DashboardPermission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DashboardTemplate),
          useValue: {
            findOne: jest.fn(),
            increment: jest.fn(),
          },
        },
        {
          provide: ClaudeService,
          useValue: {
            generateResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    dashboardRepository = module.get<Repository<Dashboard>>(getRepositoryToken(Dashboard));
    widgetRepository = module.get<Repository<DashboardWidget>>(getRepositoryToken(DashboardWidget));
    permissionRepository = module.get<Repository<DashboardPermission>>(getRepositoryToken(DashboardPermission));
    templateRepository = module.get<Repository<DashboardTemplate>>(getRepositoryToken(DashboardTemplate));
    claudeService = module.get<ClaudeService>(ClaudeService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDashboard', () => {
    const createDashboardDto: CreateDashboardDto = {
      name: 'Test Dashboard',
      type: DashboardType.PERSONAL,
      organizationId: 'org-123',
    };

    it('should create a dashboard successfully', async () => {
      const mockCreatedDashboard = { ...mockDashboard, id: 'new-dashboard-id' };
      
      jest.spyOn(dashboardRepository, 'create').mockReturnValue(mockCreatedDashboard as Dashboard);
      jest.spyOn(dashboardRepository, 'save').mockResolvedValue(mockCreatedDashboard as Dashboard);
      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(permissionRepository, 'create').mockReturnValue(mockPermission as DashboardPermission);
      jest.spyOn(permissionRepository, 'save').mockResolvedValue(mockPermission as DashboardPermission);

      const result = await service.createDashboard(createDashboardDto, 'user-123');

      expect(result).toEqual(mockCreatedDashboard);
      expect(dashboardRepository.create).toHaveBeenCalledWith({
        ...createDashboardDto,
        slug: 'test-dashboard',
        createdById: 'user-123',
        lastModifiedById: 'user-123',
      });
      expect(dashboardRepository.save).toHaveBeenCalled();
    });

    it('should generate slug if not provided', async () => {
      const dtoWithoutSlug = { ...createDashboardDto };
      delete dtoWithoutSlug.slug;
      
      jest.spyOn(dashboardRepository, 'create').mockReturnValue(mockDashboard as Dashboard);
      jest.spyOn(dashboardRepository, 'save').mockResolvedValue(mockDashboard as Dashboard);
      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(permissionRepository, 'create').mockReturnValue(mockPermission as DashboardPermission);
      jest.spyOn(permissionRepository, 'save').mockResolvedValue(mockPermission as DashboardPermission);

      await service.createDashboard(dtoWithoutSlug, 'user-123');

      expect(dashboardRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-dashboard',
        }),
      );
    });

    it('should throw error if slug already exists', async () => {
      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(mockDashboard as Dashboard);

      await expect(service.createDashboard(createDashboardDto, 'user-123')).rejects.toThrow(
        'Dashboard with this slug already exists in the organization',
      );
    });
  });

  describe('getDashboardById', () => {
    it('should return dashboard if found and user has permission', async () => {
      const mockDashboardWithRelations = {
        ...mockDashboard,
        widgets: [mockWidget],
        permissions: [mockPermission],
        createdBy: { id: 'user-123', email: 'test@example.com' },
        lastModifiedBy: null,
      };

      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(mockDashboardWithRelations as Dashboard);
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(mockPermission as DashboardPermission);
      jest.spyOn(dashboardRepository, 'increment').mockResolvedValue({ affected: 1 } as any);

      const result = await service.getDashboardById('dashboard-id', 'user-123', 'org-123');

      expect(result).toEqual(mockDashboardWithRelations);
      expect(dashboardRepository.increment).toHaveBeenCalledWith(
        { id: 'dashboard-id' },
        'viewCount',
        1,
      );
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getDashboardById('invalid-id', 'user-123', 'org-123')).rejects.toThrow(
        'Dashboard not found',
      );
    });

    it('should throw ForbiddenException if user has no permission', async () => {
      jest.spyOn(dashboardRepository, 'findOne').mockResolvedValue(mockDashboard as Dashboard);
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getDashboardById('dashboard-id', 'user-123', 'org-123')).rejects.toThrow(
        'You do not have permission to view this dashboard',
      );
    });
  });

  describe('createWidget', () => {
    const createWidgetDto: CreateWidgetDto = {
      title: 'Test Widget',
      widgetType: WidgetType.KPI_METRIC,
      dashboardId: 'dashboard-id',
    };

    it('should create widget successfully if user has permission', async () => {
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(mockPermission as DashboardPermission);
      jest.spyOn(widgetRepository, 'create').mockReturnValue(mockWidget as DashboardWidget);
      jest.spyOn(widgetRepository, 'save').mockResolvedValue(mockWidget as DashboardWidget);

      const result = await service.createWidget(createWidgetDto, 'user-123');

      expect(result).toEqual(mockWidget);
      expect(widgetRepository.create).toHaveBeenCalledWith(createWidgetDto);
      expect(widgetRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user has no permission', async () => {
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createWidget(createWidgetDto, 'user-123')).rejects.toThrow(
        'You do not have permission to add widgets to this dashboard',
      );
    });
  });

  describe('updateWidget', () => {
    const updateWidgetDto: Partial<CreateWidgetDto> = {
      title: 'Updated Widget',
    };

    it('should update widget successfully if user has permission', async () => {
      const mockWidgetWithDashboard = {
        ...mockWidget,
        dashboard: { id: 'dashboard-id' },
      };

      jest.spyOn(widgetRepository, 'findOne').mockResolvedValue(mockWidgetWithDashboard as DashboardWidget);
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(mockPermission as DashboardPermission);
      jest.spyOn(widgetRepository, 'save').mockResolvedValue({
        ...mockWidget,
        ...updateWidgetDto,
      } as DashboardWidget);

      const result = await service.updateWidget('widget-id', updateWidgetDto, 'user-123');

      expect(result.title).toBe('Updated Widget');
      expect(widgetRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if widget not found', async () => {
      jest.spyOn(widgetRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateWidget('invalid-id', updateWidgetDto, 'user-123')).rejects.toThrow(
        'Widget not found',
      );
    });
  });

  describe('deleteWidget', () => {
    it('should delete widget successfully if user has permission', async () => {
      const mockWidgetWithDashboard = {
        ...mockWidget,
        dashboard: { id: 'dashboard-id' },
      };

      jest.spyOn(widgetRepository, 'findOne').mockResolvedValue(mockWidgetWithDashboard as DashboardWidget);
      jest.spyOn(permissionRepository, 'findOne').mockResolvedValue(mockPermission as DashboardPermission);
      jest.spyOn(widgetRepository, 'softDelete').mockResolvedValue({ affected: 1 } as any);

      await service.deleteWidget('widget-id', 'user-123');

      expect(widgetRepository.softDelete).toHaveBeenCalledWith('widget-id');
    });
  });

  describe('getAIRecommendations', () => {
    it('should return AI recommendations when successful', async () => {
      const mockRecommendations = [
        {
          name: 'AI Dashboard',
          description: 'AI-powered insights',
          type: DashboardType.PERSONAL,
          widgets: ['ai_insights'],
          tags: ['ai'],
        },
      ];

      jest.spyOn(service as any, 'getUserDashboards').mockResolvedValue({
        dashboards: [mockDashboard as Dashboard],
        total: 1,
      });
      jest.spyOn(claudeService, 'generateResponse').mockResolvedValue(JSON.stringify(mockRecommendations));

      const result = await service.getAIRecommendations('user-123', 'org-123', 'test context');

      expect(result).toEqual(mockRecommendations);
      expect(claudeService.generateResponse).toHaveBeenCalled();
    });

    it('should return fallback recommendations when AI fails', async () => {
      jest.spyOn(service as any, 'getUserDashboards').mockResolvedValue({
        dashboards: [],
        total: 0,
      });
      jest.spyOn(claudeService, 'generateResponse').mockRejectedValue(new Error('AI service error'));

      const result = await service.getAIRecommendations('user-123', 'org-123');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Project Overview Dashboard');
    });
  });

  describe('createFromTemplate', () => {
    const createDashboardDto: CreateDashboardDto = {
      name: 'Template Dashboard',
      type: DashboardType.PERSONAL,
      organizationId: 'org-123',
    };

    const mockTemplate = {
      id: 'template-id',
      config: {
        widgets: [
          {
            title: 'Template Widget',
            widgetType: WidgetType.KPI_METRIC,
            size: WidgetSize.MEDIUM,
          },
        ],
      },
    };

    it('should create dashboard from template successfully', async () => {
      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as DashboardTemplate);
      jest.spyOn(service, 'createDashboard').mockResolvedValue(mockDashboard as Dashboard);
      jest.spyOn(service, 'createWidget').mockResolvedValue(mockWidget as DashboardWidget);
      jest.spyOn(templateRepository, 'increment').mockResolvedValue({ affected: 1 } as any);

      const result = await service.createFromTemplate('template-id', createDashboardDto, 'user-123');

      expect(result).toEqual(mockDashboard);
      expect(service.createDashboard).toHaveBeenCalledWith(createDashboardDto, 'user-123');
      expect(service.createWidget).toHaveBeenCalled();
      expect(templateRepository.increment).toHaveBeenCalled();
    });

    it('should throw NotFoundException if template not found', async () => {
      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createFromTemplate('invalid-id', createDashboardDto, 'user-123')).rejects.toThrow(
        'Template not found',
      );
    });
  });
});
