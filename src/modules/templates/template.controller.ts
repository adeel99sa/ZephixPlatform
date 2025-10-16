import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TemplateService } from './template.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async getSystemTemplates(@Request() req: any) {
    return this.templateService.getSystemTemplates(req.user.organizationId);
  }

  @Post(':id/activate')
  async activateTemplate(@Param('id') id: string, @Request() req: any) {
    return this.templateService.activateTemplate(id, req.user.organizationId);
  }
}
