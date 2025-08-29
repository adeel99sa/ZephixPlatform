import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ProjectsService } from "../services/projects.service";
import { CreateProjectDto } from "../dto/create-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";

@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get("test")
  async test() {
    return { message: "Projects controller is working", timestamp: new Date() };
  }

  @Get()
  async findAll(@Request() req) {
    const user = req.user;
    return this.projectsService.findAllProjects(user.organizationId);
  }

  // NEW ENDPOINT: Following Organizations controller pattern
  @Get("organization/statistics")
  async getOrganizationStatistics(@Request() req) {
    return this.projectsService.getOrganizationStats(req.user.organizationId);
  }

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    const user = req.user;
    return this.projectsService.createProject(createProjectDto, user.organizationId, user.id);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const user = req.user;
    return this.projectsService.findProjectById(id, user.organizationId);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req) {
    const user = req.user;
    return this.projectsService.updateProject(id, updateProjectDto, user.organizationId, user.id);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Request() req) {
    const user = req.user;
    return this.projectsService.deleteProject(id, user.organizationId, user.id);
  }
}