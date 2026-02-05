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
import { GateApprovalsService } from './gate-approvals.service';
import { TemplatePolicyResolverService } from '../policies/template-policy-resolver.service';
import { GateDecideDto } from './dto/gate-decide.dto';

@Controller('template-center/projects')
@UseGuards(JwtAuthGuard)
export class GateApprovalsController {
  constructor(
    private readonly service: GateApprovalsService,
    private readonly policyResolver: TemplatePolicyResolverService,
  ) {}

  @Post(':projectId/gates/:gateKey/decide')
  async decide(
    @Param('projectId') projectId: string,
    @Param('gateKey') gateKey: string,
    @Body() dto: GateDecideDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const requirements = await this.policyResolver.getGateRequirements(
      projectId,
      gateKey,
    );
    return this.service.decide(
      projectId,
      gateKey,
      dto,
      auth.userId,
      auth.organizationId,
      auth.workspaceId ?? null,
      requirements,
    );
  }
}
