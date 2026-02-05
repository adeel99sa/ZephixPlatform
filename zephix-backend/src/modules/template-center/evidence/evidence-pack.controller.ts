import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { EvidencePackService } from './evidence-pack.service';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/projects')
@UseGuards(JwtAuthGuard)
export class EvidencePackController {
  constructor(private readonly service: EvidencePackService) {}

  @Get(':projectId/evidence-pack')
  async getEvidencePack(
    @Param('projectId') projectId: string,
    @Query('format') format: string,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    const json = await this.service.getJson(
      projectId,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
    if (format === 'json' || !format) {
      return json;
    }
    return json; // PDF/ZIP stubs later
  }
}
