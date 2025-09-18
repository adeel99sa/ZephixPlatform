import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TemplateService } from '../services/template.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateProjectFromTemplateDto } from '../dto/create-from-template.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async getAllTemplates(@Request() req) {
    return this.templateService.getAllTemplates(req.user.organizationId);
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.templateService.getTemplateById(id);
  }

  @Get('blocks/all')
  async getAllBlocks(@Request() req) {
    return this.templateService.getAllBlocks(req.user.organizationId);
  }

  @Get('blocks/type/:type')
  async getBlocksByType(@Param('type') type: string, @Request() req) {
    return this.templateService.getBlocksByType(type, req.user.organizationId);
  }

  @Post('create-project')
  async createProjectFromTemplate(@Body() dto: CreateProjectFromTemplateDto, @Request() req) {
    return this.templateService.createProjectFromTemplate(dto, req.user.id, req.user.organizationId);
  }

  @Post('projects/:projectId/blocks/:blockId')
  async addBlockToProject(
    @Param('projectId') projectId: string,
    @Param('blockId') blockId: string,
    @Body() configuration: any
  ) {
    return this.templateService.addBlockToProject(projectId, blockId, configuration);
  }
}


