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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GovernanceRulesAdminService } from '../services/governance-rules-admin.service';
import {
  CreateRuleSetDto,
  UpdateRuleSetDto,
  AddRuleVersionDto,
  SetActiveVersionDto,
  ListEvaluationsQueryDto,
} from '../dto/governance-rules.dto';

@Controller('admin/governance-rules')
@UseGuards(JwtAuthGuard)
export class GovernanceRulesController {
  constructor(
    private readonly adminService: GovernanceRulesAdminService,
  ) {}

  // --- Rule Sets ---

  @Post('rule-sets')
  async createRuleSet(@Body() dto: CreateRuleSetDto, @Req() req: any) {
    return this.adminService.createRuleSet({
      ...dto,
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
  async getRuleSet(@Param('id') id: string) {
    return this.adminService.getRuleSet(id);
  }

  @Patch('rule-sets/:id')
  async updateRuleSet(
    @Param('id') id: string,
    @Body() dto: UpdateRuleSetDto,
  ) {
    return this.adminService.updateRuleSet(id, dto);
  }

  @Post('rule-sets/:id/deactivate')
  async deactivateRuleSet(@Param('id') id: string) {
    return this.adminService.deactivateRuleSet(id);
  }

  // --- Rules ---

  @Get('rule-sets/:id/rules')
  async listRules(@Param('id') id: string) {
    return this.adminService.listRules(id);
  }

  @Get('rule-sets/:id/rules/active')
  async listActiveRules(@Param('id') id: string) {
    return this.adminService.listActiveRules(id);
  }

  @Post('rule-sets/:id/rules')
  async addRuleVersion(
    @Param('id') id: string,
    @Body() dto: AddRuleVersionDto,
    @Req() req: any,
  ) {
    return this.adminService.addRuleVersion({
      ruleSetId: id,
      code: dto.code,
      ruleDefinition: dto.ruleDefinition,
      createdBy: req.user?.userId,
      setActive: dto.setActive,
    });
  }

  @Post('rule-sets/:id/rules/set-active')
  async setActiveVersion(
    @Param('id') id: string,
    @Body() dto: SetActiveVersionDto,
  ) {
    return this.adminService.setActiveVersion(id, dto.code, dto.ruleId);
  }

  // --- Evaluations ---

  @Get('evaluations/:workspaceId')
  async listEvaluations(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListEvaluationsQueryDto,
  ) {
    return this.adminService.listEvaluations({
      workspaceId,
      ...query,
    });
  }
}
