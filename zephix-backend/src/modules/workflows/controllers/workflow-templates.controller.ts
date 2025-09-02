import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  BadRequestException,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../modules/organizations/guards/organization.guard';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { WorkflowTemplatesService } from '../services/workflow-templates.service';
import {
  WorkflowTemplateDto,
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  WorkflowTemplatesResponseDto,
  WorkflowType,
  WorkflowStatus,
  WorkflowTemplateWithRelationsDto,
  CloneTemplateDto,
} from '../dto/workflow.dto';

@ApiTags('Workflow Templates')
@Controller('workflows/templates')
@UseGuards(JwtAuthGuard, OrganizationGuard, RateLimiterGuard)
@ApiBearerAuth()
export class WorkflowTemplatesController {
  constructor(
    private readonly workflowTemplatesService: WorkflowTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new workflow template',
    description:
      'Create a new workflow template with stages and approval gates for the organization',
  })
  @ApiBody({ type: CreateWorkflowTemplateDto })
  @ApiResponse({
    status: 201,
    description: 'Workflow template created successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template data or structure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 413,
    description: 'Organization template limit exceeded',
  })
  async createWorkflowTemplate(
    @Body() createDto: CreateWorkflowTemplateDto,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.workflowTemplatesService.createWorkflowTemplate(
        createDto,
        organizationId,
        userId,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to create workflow template: ${error.message}`,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflow templates for organization' })
  @ApiResponse({
    status: 200,
    description: 'Workflow templates retrieved successfully',
    type: WorkflowTemplatesResponseDto,
  })
  async getWorkflowTemplates(
    @Request() req: any,
    @Query('status') status?: WorkflowStatus,
    @Query('type') type?: WorkflowType,
    @Query('isDefault') isDefault?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<WorkflowTemplatesResponseDto> {
    const organizationId = req.headers['x-org-id'];
    const templates = await this.workflowTemplatesService.findAll(
      organizationId,
      { status, type, isDefault },
    );

    const total = templates.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTemplates = templates.slice(startIndex, endIndex);

    return {
      templates: paginatedTemplates,
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get default workflow template',
    description: 'Retrieve the default workflow template for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Default workflow template retrieved successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No default template found',
  })
  async getDefaultTemplate(
    @Request() req: any,
  ): Promise<WorkflowTemplateDto | null> {
    try {
      const organizationId = req.headers['x-org-id'];

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.workflowTemplatesService.getDefaultTemplate(
        organizationId,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve default template: ${error.message}`,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template retrieved successfully',
    type: WorkflowTemplateWithRelationsDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow template not found' })
  async getWorkflowTemplateById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowTemplateWithRelationsDto> {
    const organizationId = req.headers['x-org-id'];
    return await this.workflowTemplatesService.findById(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update workflow template',
    description:
      'Update an existing workflow template (only draft or active templates can be modified)',
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID' })
  @ApiBody({ type: UpdateWorkflowTemplateDto })
  @ApiResponse({
    status: 200,
    description: 'Workflow template updated successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Template cannot be modified in current state',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow template not found',
  })
  async updateWorkflowTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowTemplateDto,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.workflowTemplatesService.updateWorkflowTemplate(
        id,
        updateDto,
        organizationId,
        userId,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to update workflow template: ${error.message}`,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow template' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Workflow template not found' })
  async deleteWorkflowTemplate(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const organizationId = req.headers['x-org-id'];
    const userId = req.user?.id || 'system';
    await this.workflowTemplatesService.deleteWorkflowTemplate(
      id,
      organizationId,
      userId,
    );
    return { message: 'Workflow template deleted successfully' };
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone workflow template' })
  @ApiResponse({
    status: 201,
    description: 'Workflow template cloned successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow template not found' })
  async cloneWorkflowTemplate(
    @Param('id') id: string,
    @Body() dto: CloneTemplateDto,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    const organizationId = req.headers['x-org-id'];
    return await this.workflowTemplatesService.cloneTemplate(
      id,
      organizationId,
      dto,
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate workflow template' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template activated successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow template not found' })
  async activateWorkflowTemplate(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    const organizationId = req.headers['x-org-id'];
    const userId = req.user?.id || 'system';
    return await this.workflowTemplatesService.updateWorkflowTemplate(
      id,
      { status: WorkflowStatus.ACTIVE },
      organizationId,
      userId,
    );
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive workflow template' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template archived successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow template not found' })
  async archiveWorkflowTemplate(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    const organizationId = req.headers['x-org-id'];
    const userId = req.user?.id || 'system';
    return await this.workflowTemplatesService.updateWorkflowTemplate(
      id,
      { status: WorkflowStatus.ARCHIVED },
      organizationId,
      userId,
    );
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set workflow template as default' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template set as default successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow template not found' })
  async setDefaultWorkflowTemplate(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    const organizationId = req.headers['x-org-id'];
    const userId = req.user?.id || 'system';
    return await this.workflowTemplatesService.updateWorkflowTemplate(
      id,
      { isDefault: true },
      organizationId,
      userId,
    );
  }
}
