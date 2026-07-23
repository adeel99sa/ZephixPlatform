import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../admin/guards/admin.guard';
import { GovernanceRulesAdminService } from '../services/governance-rules-admin.service';
import {
  CreateRuleSetDto,
  UpdateRuleSetDto,
  AddRuleVersionDto,
  SetActiveVersionDto,
  ListEvaluationsQueryDto,
} from '../dto/governance-rules.dto';

@Controller('admin/governance-rules')
@UseGuards(JwtAuthGuard, AdminGuard)
export class GovernanceRulesController {
  constructor(
    private readonly adminService: GovernanceRulesAdminService,
  ) {}

  // Org comes from the authenticated context, never from client input.
  private requireOrgId(req: any): string {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }
    return organizationId;
  }

  // --- Rule Sets ---

  @Post('rule-sets')
  async createRuleSet(@Body() dto: CreateRuleSetDto, @Req() req: any) {
    const organizationId = this.requireOrgId(req);
    return this.adminService.createRuleSet({
      ...dto,
      organizationId, // bind from context; ignore any client-supplied org
      createdBy: req.user?.userId ?? null,
    });
  }

  @Get('rule-sets')
  async listRuleSets(
    @Query('organizationId') organizationId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.listRuleSets({
      organizationId,
      workspaceId,
      entityType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('rule-sets/:id')
  async getRuleSet(@Param('id') id: string, @Req() req: any) {
    return this.adminService.getRuleSet(id, this.requireOrgId(req));
  }

  @Patch('rule-sets/:id')
  async updateRuleSet(
    @Param('id') id: string,
    @Body() dto: UpdateRuleSetDto,
    @Req() req: any,
  ) {
    return this.adminService.updateRuleSet(id, dto, this.requireOrgId(req));
  }

  @Post('rule-sets/:id/deactivate')
  async deactivateRuleSet(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deactivateRuleSet(id, this.requireOrgId(req));
  }

  // --- Rules ---

  @Get('rule-sets/:id/rules')
  async listRules(@Param('id') id: string, @Req() req: any) {
    return this.adminService.listRules(id, this.requireOrgId(req));
  }

  @Get('rule-sets/:id/rules/active')
  async listActiveRules(@Param('id') id: string, @Req() req: any) {
    return this.adminService.listActiveRules(id, this.requireOrgId(req));
  }

  @Post('rule-sets/:id/rules')
  async addRuleVersion(
    @Param('id') id: string,
    @Body() dto: AddRuleVersionDto,
    @Req() req: any,
  ) {
    const organizationId = this.requireOrgId(req);
    return this.adminService.addRuleVersion(
      {
        ruleSetId: id,
        code: dto.code,
        ruleDefinition: dto.ruleDefinition,
        createdBy: req.user?.userId,
        setActive: dto.setActive,
      },
      organizationId,
    );
  }

  @Post('rule-sets/:id/rules/set-active')
  async setActiveVersion(
    @Param('id') id: string,
    @Body() dto: SetActiveVersionDto,
    @Req() req: any,
  ) {
    return this.adminService.setActiveVersion(
      id,
      dto.code,
      dto.ruleId,
      this.requireOrgId(req),
    );
  }

  // --- Evaluations ---

  @Get('evaluations/:workspaceId')
  async listEvaluations(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListEvaluationsQueryDto,
    @Req() req: any,
  ) {
    return this.adminService.listEvaluations({
      organizationId: this.requireOrgId(req),
      workspaceId,
      ...query,
    });
  }
}
