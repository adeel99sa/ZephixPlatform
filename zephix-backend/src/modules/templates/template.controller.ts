import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TemplateService } from './template.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProjectFromTemplateDto } from './dto/create-from-template.dto';

@Controller('templates')
@UseGuards(AuthGuard('jwt'))
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async getTemplates(@Req() req: any) {
    const organizationId = req.user.organizationId || 'default';
    return this.templateService.getAllTemplates(organizationId);
  }

  @Post(':id/activate')
  async activateTemplate(
    @Param('id') templateId: string,
    @Req() req: any
  ) {
    const organizationId = req.user.organizationId || 'default';
    return this.templateService.activateTemplate(templateId, organizationId);
  }

  @Post(':id/create-project')
  async createProjectFromTemplate(
    @Param('id') templateId: string,
    @Body() dto: CreateProjectFromTemplateDto,
    @Req() req: any
  ) {
    const organizationId = req.user.organizationId || 'default';
    const userId = req.user.id;
    
    return this.templateService.createProjectFromTemplate(templateId, dto, userId, organizationId);
  }
}
