import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TemplateKpisService, AssignKpiInput } from '../services/template-kpis.service';
import { IsUUID, IsOptional, IsBoolean, Matches } from 'class-validator';

interface AuthRequest {
  user?: {
    userId: string;
    organizationId: string;
    platformRole?: string;
  };
}

function getAuthContext(req: AuthRequest) {
  const user = req.user;
  if (!user) throw new Error('Unauthenticated');
  return { userId: user.userId, organizationId: user.organizationId };
}

class AssignKpiDto {
  @IsUUID()
  kpiDefinitionId!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'defaultTarget must be a decimal number with up to 2 decimals (e.g. "95.5")',
  })
  defaultTarget?: string;
}

/**
 * Wave 4B: Template KPI management endpoints.
 *
 * Allows assigning KPI definitions to templates and listing/removing assignments.
 * Admin-only operations scoped by organizationId.
 */
@Controller('admin/templates/:templateId/kpis')
@UseGuards(JwtAuthGuard)
export class TemplateKpisController {
  constructor(private readonly service: TemplateKpisService) {}

  @Get()
  async list(
    @Param('templateId') templateId: string,
    @Req() req: AuthRequest,
  ) {
    getAuthContext(req); // Validate authentication
    const kpis = await this.service.listTemplateKpis(templateId);
    return { data: kpis };
  }

  @Post()
  async assign(
    @Param('templateId') templateId: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: AssignKpiDto,
    @Req() req: AuthRequest,
  ) {
    getAuthContext(req); // Validate authentication
    const input: AssignKpiInput = {
      kpiDefinitionId: dto.kpiDefinitionId,
      isRequired: dto.isRequired,
      defaultTarget: dto.defaultTarget ?? null,
    };
    const result = await this.service.assignKpiToTemplate(templateId, input);
    return { data: result };
  }

  @Delete(':kpiDefinitionId')
  async remove(
    @Param('templateId') templateId: string,
    @Param('kpiDefinitionId') kpiDefinitionId: string,
    @Req() req: AuthRequest,
  ) {
    getAuthContext(req); // Validate authentication
    await this.service.removeTemplateKpi(templateId, kpiDefinitionId);
    return { message: 'OK' };
  }

  /**
   * Wave 4D: Apply a curated KPI pack to a template.
   * Idempotent — skips already-assigned KPIs.
   */
  @Post('packs/:packCode/apply')
  async applyPack(
    @Param('templateId') templateId: string,
    @Param('packCode') packCode: string,
    @Req() req: AuthRequest,
  ) {
    getAuthContext(req); // Validate authentication
    const result = await this.service.applyPack(templateId, packCode);
    return { data: result };
  }

  /**
   * Wave 4D: List available KPI packs.
   */
  @Get('packs')
  async listPacks(@Req() req: AuthRequest) {
    getAuthContext(req);
    return { data: this.service.listPacks() };
  }
}
