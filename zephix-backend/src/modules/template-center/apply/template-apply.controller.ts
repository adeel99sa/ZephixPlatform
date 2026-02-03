import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { TemplateApplyService } from './template-apply.service';
import { ApplyTemplateDto } from '../templates/dto/apply-template.dto';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/projects')
@UseGuards(JwtAuthGuard)
export class TemplateApplyController {
  constructor(private readonly service: TemplateApplyService) {}

  @Post(':projectId/apply')
  async apply(
    @Param('projectId') projectId: string,
    @Body() dto: ApplyTemplateDto,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const version =
      dto.version != null ? parseInt(String(dto.version), 10) : undefined;
    const options = dto.options ?? { mode: 'create_missing_only' };
    return this.service.apply(
      projectId,
      dto.templateKey,
      Number.isNaN(version) ? undefined : version,
      auth.userId,
      auth.organizationId!,
      auth.workspaceId ?? null,
      options,
    );
  }
}
