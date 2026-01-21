import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireWorkspaceAccessGuard } from '../workspaces/guards/require-workspace-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SetMetadata } from '@nestjs/common';
import { LinkProjectDto } from './dto/link-project.dto';
import { ProjectsService } from './services/projects.service';
import { ProgramsService } from '../programs/services/programs.service';
import { PortfoliosService } from '../portfolios/services/portfolios.service';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import {
  normalizePlatformRole,
  isAdminRole,
} from '../../shared/enums/platform-roles.enum';
import { formatResponse } from '../../shared/helpers/response.helper';

/**
 * PHASE 6: Workspace-Scoped Project Routes Controller
 * Routes: /api/workspaces/:workspaceId/projects/:projectId/link
 * Owned by ProjectsModule for domain consistency
 */
@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard)
export class WorkspaceProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly programsService: ProgramsService,
    private readonly portfoliosService: PortfoliosService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  /**
   * PHASE 6: Link project to portfolio/program
   * PATCH /api/workspaces/:workspaceId/projects/:projectId/link
   */
  @Patch(':projectId/link')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  async linkProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() linkDto: LinkProjectDto,
    @CurrentUser() user: any,
  ) {
    const organizationId = user.organizationId;
    const userId = user.id;

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access - return 404 if no access (prevents existence leakage)
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      normalizePlatformRole(user.platformRole || user.role),
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can link) - generic message
    const userRole = normalizePlatformRole(user.platformRole || user.role);
    if (!isAdminRole(userRole)) {
      throw new ForbiddenException('Forbidden');
    }

    // Load project using workspace-scoped method (prevents existence leakage)
    const project = await this.projectsService.findByIdInWorkspace(
      projectId,
      organizationId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Handle unlinking: if both are explicitly null/undefined, clear both fields
    const isUnlinking = !linkDto.programId && !linkDto.portfolioId;

    if (isUnlinking) {
      // Unlink: clear both programId and portfolioId
      const updatedProject = await this.projectsService.updateProject(
        projectId,
        {
          portfolioId: null,
          programId: null,
        } as any,
        organizationId,
        userId,
      );
      return formatResponse(updatedProject);
    }

    let portfolioId: string | null = linkDto.portfolioId || null;
    const programId: string | null = linkDto.programId || null;

    // If programId provided, load program and derive portfolioId
    if (programId) {
      const program = await this.programsService.getById(
        programId,
        organizationId,
        workspaceId,
      );

      if (!program) {
        throw new NotFoundException('Program not found');
      }

      // Validate program belongs to workspace (already checked by getById, but explicit for clarity)
      if (program.workspaceId !== workspaceId) {
        throw new NotFoundException('Program not found');
      }

      // Derive portfolioId from program if not provided
      if (!portfolioId) {
        portfolioId = program.portfolioId;
      } else {
        // If both provided, validate program.portfolioId equals portfolio.id
        if (program.portfolioId !== portfolioId) {
          throw new BadRequestException(
            'Program does not belong to the specified portfolio',
          );
        }
      }
    }

    // If portfolioId provided (and no programId), validate portfolio
    if (portfolioId && !programId) {
      const portfolio = await this.portfoliosService.getById(
        portfolioId,
        organizationId,
        workspaceId,
      );

      if (!portfolio) {
        throw new NotFoundException('Portfolio not found');
      }

      // Validate portfolio belongs to workspace (already checked by getById, but explicit for clarity)
      if (portfolio.workspaceId !== workspaceId) {
        throw new NotFoundException('Portfolio not found');
      }
    }

    // Update project with linking
    const updatedProject = await this.projectsService.updateProject(
      projectId,
      {
        portfolioId: portfolioId || null,
        programId: programId || null,
      } as any,
      organizationId,
      userId,
    );

    return formatResponse(updatedProject);
  }
}
