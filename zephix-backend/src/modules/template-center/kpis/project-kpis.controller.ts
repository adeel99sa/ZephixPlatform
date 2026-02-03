import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { ProjectKpisService } from './project-kpis.service';
import { UpsertKpiValueDto } from './dto/kpi-values.dto';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/projects')
@UseGuards(JwtAuthGuard)
export class ProjectKpisController {
  constructor(private readonly service: ProjectKpisService) {}

  @Get(':projectId/kpis')
  async list(
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.list(
      projectId,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
  }

  @Put(':projectId/kpis/:kpiKey/value')
  async setValue(
    @Param('projectId') projectId: string,
    @Param('kpiKey') kpiKey: string,
    @Body() dto: UpsertKpiValueDto,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.recordValue(
      projectId,
      kpiKey,
      dto.value,
      dto.asOfDate,
      dto.note,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
  }
}
