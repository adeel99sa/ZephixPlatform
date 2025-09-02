import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('templates')
@UseGuards(AuthGuard('jwt'))
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async getTemplates(@Req() req: any) {
    const organizationId = req.user.organizationId || 'default';
    return this.templateService.getSystemTemplates(organizationId);
  }

  @Post(':id/activate')
  async activateTemplate(@Param('id') templateId: string, @Req() req: any) {
    const organizationId = req.user.organizationId || 'default';
    return this.templateService.activateTemplate(templateId, organizationId);
  }
}
