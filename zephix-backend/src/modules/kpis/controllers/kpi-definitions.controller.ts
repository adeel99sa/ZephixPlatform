import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { KpiDefinitionsService } from '../services/kpi-definitions.service';

interface AuthRequest {
  user?: {
    userId: string;
    organizationId: string;
  };
}

function getAuthContext(req: AuthRequest) {
  const user = req.user;
  if (!user) throw new Error('Unauthenticated');
  return { userId: user.userId, organizationId: user.organizationId };
}

/**
 * Wave 4C: Global KPI definitions endpoint (not project-scoped).
 * Used by admin UI for template KPI selection.
 */
@Controller('kpis')
@UseGuards(JwtAuthGuard)
export class KpiDefinitionsController {
  constructor(private readonly definitionsService: KpiDefinitionsService) {}

  @Get('definitions')
  async listDefinitions(@Req() req: AuthRequest) {
    const auth = getAuthContext(req);
    const definitions = await this.definitionsService.listDefinitions(
      true,
      auth.organizationId,
    );
    return { data: definitions };
  }
}
