import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { RolesGuard } from '../../organizations/guards/roles.guard';
import { Roles } from '../../organizations/decorators/roles.decorator';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  CloneWorkflowTemplateDto,
  TemplateListQueryDto,
  CreateWorkflowInstanceDto,
  UpdateWorkflowInstanceDto,
  WorkflowActionDto,
} from '../dto/workflow-template.dto';

@ApiTags('Workflow Templates')
@ApiBearerAuth()
@Controller('pm/workflow-templates')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class WorkflowTemplateController {
  constructor(private readonly templateService: WorkflowTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List organization workflow templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async findAll(
    @CurrentOrg() orgId: string,
    @Query() query: TemplateListQueryDto,
  ) {
    return this.templateService.findByOrganization(orgId, query);
  }

  @Get('defaults')
  @ApiOperation({ summary: 'Get default workflow templates' })
  @ApiResponse({
    status: 200,
    description: 'Default templates retrieved successfully',
  })
  async getDefaults(@CurrentOrg() orgId: string) {
    return this.templateService.getDefaultTemplates(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.templateService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new workflow template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid template configuration' })
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateWorkflowTemplateDto,
  ) {
    return this.templateService.create(orgId, createDto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async update(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowTemplateDto,
  ) {
    return this.templateService.update(orgId, id, updateDto, user.id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone existing workflow template' })
  @ApiResponse({ status: 201, description: 'Template cloned successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async clone(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() cloneDto: CloneWorkflowTemplateDto,
  ) {
    return this.templateService.clone(orgId, id, cloneDto, user.id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate workflow template' })
  @ApiResponse({ status: 200, description: 'Template activated successfully' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async activate(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.templateService.activate(orgId, id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate workflow template' })
  @ApiResponse({
    status: 200,
    description: 'Template deactivated successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot deactivate template with active instances',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async deactivate(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.templateService.deactivate(orgId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow template' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete template with existing instances',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async delete(@CurrentOrg() orgId: string, @Param('id') id: string) {
    await this.templateService.delete(orgId, id);
  }

  // Workflow Instance endpoints
  @Get(':id/instances')
  @ApiOperation({ summary: 'List workflow instances for template' })
  @ApiResponse({ status: 200, description: 'Instances retrieved successfully' })
  async getInstances(
    @CurrentOrg() orgId: string,
    @Param('id') templateId: string,
    @Query() query: any,
  ) {
    return this.templateService.findInstances(orgId, { ...query, templateId });
  }

  @Post(':id/instances')
  @ApiOperation({ summary: 'Create new workflow instance' })
  @ApiResponse({ status: 201, description: 'Instance created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid instance configuration' })
  async createInstance(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Param('id') templateId: string,
    @Body() createDto: CreateWorkflowInstanceDto,
  ) {
    return this.templateService.createInstance(
      orgId,
      { ...createDto, templateId },
      user.id,
    );
  }
}

@ApiTags('Workflow Instances')
@ApiBearerAuth()
@Controller('pm/workflow-instances')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class WorkflowInstanceController {
  constructor(private readonly templateService: WorkflowTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List organization workflow instances' })
  @ApiResponse({ status: 200, description: 'Instances retrieved successfully' })
  async findAll(@CurrentOrg() orgId: string, @Query() query: any) {
    return this.templateService.findInstances(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow instance by ID' })
  @ApiResponse({ status: 200, description: 'Instance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.templateService.findInstanceById(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance updated successfully' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async update(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowInstanceDto,
  ) {
    return this.templateService.updateInstance(orgId, id, updateDto);
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Execute action on workflow instance' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action' })
  @HttpCode(HttpStatus.OK)
  async executeAction(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() actionDto: WorkflowActionDto,
  ) {
    return this.templateService.executeAction(orgId, id, actionDto, user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get workflow instance stage history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getHistory(@CurrentOrg() orgId: string, @Param('id') id: string) {
    const instance = await this.templateService.findInstanceById(orgId, id);
    return {
      instanceId: instance.id,
      currentStage: instance.currentStage,
      stageHistory: instance.stageHistory,
      approvals: instance.approvals,
      metrics: instance.getStageMetrics(),
      totalDuration: instance.getTotalDuration(),
    };
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get workflow instance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(@CurrentOrg() orgId: string, @Param('id') id: string) {
    const instance = await this.templateService.findInstanceById(orgId, id);
    return {
      instanceId: instance.id,
      status: instance.status,
      currentStage: instance.currentStage,
      stageMetrics: instance.getStageMetrics(),
      totalDuration: instance.getTotalDuration(),
      pendingApprovals: instance.getPendingApprovals().length,
      canProgress: instance.canProgressToNextStage(),
    };
  }
}
