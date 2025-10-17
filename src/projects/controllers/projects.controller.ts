import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, Logger, InternalServerErrorException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ProjectsService } from "../services/projects.service";
import { CreateProjectDto } from "../dto/create-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";
import { AssignUserDto } from "../dto/assign-user.dto";

@Controller("projects")
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly projectsService: ProjectsService) {}

  @Get("test")
  async test() {
    return { message: "Projects controller is working", timestamp: new Date() };
  }

  @Get()
  async list() {
    try {
      const rows = await this.projectsService.findAll();
      return { success: true, data: rows };
    } catch (err: any) {
      this.logger.error('GET /projects failed', err?.stack ?? String(err));
      // Never 500 for list reads
      return { success: true, data: [], note: 'fallback' };
    }
  }

  // NEW ENDPOINT: Following Organizations controller pattern
  @Get("organization/statistics")
  async getOrganizationStatistics(@Request() req: any) {
    return this.projectsService.getOrganizationStats(req.user.organizationId);
  }

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    const user = req.user;
    return this.projectsService.createProject(createProjectDto, user.organizationId, user.id);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: any) {
    const user = req.user;
    return this.projectsService.findProjectById(id, user.organizationId);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req: any) {
    const user = req.user;
    return this.projectsService.updateProject(id, updateProjectDto, user.organizationId, user.id);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Request() req: any) {
    const user = req.user;
    return this.projectsService.deleteProject(id, user.organizationId, user.id);
  }

  @Post(':id/assign')
  async assignUser(
    @Param('id') projectId: string,
    @Body() dto: AssignUserDto,
    @Request() req: any,
  ) {
    const user = req.user;
    return this.projectsService.assignUser(
      projectId,
      dto.userId,
      dto.role || 'contributor',
      user.organizationId,
    );
  }

  @Get(':id/assignments')
  async getAssignments(
    @Param('id') projectId: string,
    @Request() req: any,
  ) {
    const user = req.user;
    return this.projectsService.getProjectAssignments(projectId, user.organizationId);
  }

  @Delete(':id/assign/:userId')
  async removeUser(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const user = req.user;
    return this.projectsService.removeUser(projectId, userId, user.organizationId);
  }
}
