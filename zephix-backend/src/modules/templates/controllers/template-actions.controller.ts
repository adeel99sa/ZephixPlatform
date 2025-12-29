import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TemplatesService } from '../services/templates.service';
import { TemplateLockGuard } from '../guards/template-lock.guard';
import { CloneTemplateDto } from '../dto/template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireOrgRole } from '../../workspaces/guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../../workspaces/guards/require-org-role.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateActionsController {
  constructor(private readonly templates: TemplatesService) {}

  @UseGuards(TemplateLockGuard)
  @Post(':id/clone')
  async clone(
    @Param('id') id: string,
    @Body() dto: CloneTemplateDto,
    @Req() req: Request,
  ) {
    return { data: await this.templates.cloneV1(req, id) };
  }

  @Post(':id/default')
  @UseGuards(TemplateLockGuard, RequireOrgRoleGuard)
  @RequireOrgRole('admin')
  async setDefault(@Param('id') id: string, @Req() req: Request) {
    return { data: await this.templates.setDefaultV1(req, id) };
  }

  @Post(':id/lock')
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole('admin')
  async lock(@Param('id') id: string, @Req() req: Request) {
    return { data: await this.templates.lockV1(req, id) };
  }

  @Post(':id/unlock')
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole('admin')
  async unlock(@Param('id') id: string, @Req() req: Request) {
    return { data: await this.templates.unlockV1(req, id) };
  }

  @Post(':id/archive')
  @UseGuards(TemplateLockGuard)
  async archive(@Param('id') id: string, @Req() req: Request) {
    return { data: await this.templates.archiveV1(req, id) };
  }
}
