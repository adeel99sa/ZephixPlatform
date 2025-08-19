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
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { WorkflowTemplatesService } from '../services/workflow-templates.service';
import { 
  WorkflowTemplateDto, 
  CreateWorkflowTemplateDto, 
  UpdateWorkflowTemplateDto, 
  WorkflowTemplatesResponseDto,
  WorkflowType,
  WorkflowStatus
} from '../dto/workflow.dto';

@ApiTags('Workflow Templates')
@Controller('workflows/templates')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class WorkflowTemplatesController {
  constructor(
    private readonly workflowTemplatesService: WorkflowTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new workflow template',
    description: 'Create a new workflow template with stages and approval gates for the organization'
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
      throw new BadRequestException(`Failed to create workflow template: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get workflow templates',
    description: 'Retrieve workflow templates for the organization with filtering and pagination'
  })
  @ApiQuery({ name: 'status', required: false, enum: WorkflowStatus })
  @ApiQuery({ name: 'type', required: false, enum: WorkflowType })
  @ApiQuery({ name: 'isDefault', required: false, type: Boolean })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
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
    @Query('isPublic') isPublic?: boolean,
    @Query('tags') tags?: string[],
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<WorkflowTemplatesResponseDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      
      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      // Validate pagination parameters
      if (page < 1) {
        throw new BadRequestException('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      return await this.workflowTemplatesService.getWorkflowTemplates(
        organizationId,
        status,
        type,
        isDefault,
        isPublic,
        tags,
        page,
        limit,
      );
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve workflow templates: ${error.message}`);
    }
  }

  @Get('default')
  @ApiOperation({ 
    summary: 'Get default workflow template',
    description: 'Retrieve the default workflow template for the organization'
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
  async getDefaultTemplate(@Request() req: any): Promise<WorkflowTemplateDto | null> {
    try {
      const organizationId = req.headers['x-org-id'];
      
      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.workflowTemplatesService.getDefaultTemplate(organizationId);
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve default template: ${error.message}`);
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get workflow template by ID',
    description: 'Retrieve a specific workflow template with all stages and approval gates'
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template retrieved successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow template not found',
  })
  async getWorkflowTemplateById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      
      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.workflowTemplatesService.getWorkflowTemplateById(id, organizationId);
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve workflow template: ${error.message}`);
    }
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update workflow template',
    description: 'Update an existing workflow template (only draft or active templates can be modified)'
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
      throw new BadRequestException(`Failed to update workflow template: ${error.message}`);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete workflow template',
    description: 'Soft delete a workflow template (only draft templates with no usage can be deleted)'
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID' })
  @ApiResponse({
    status: 204,
    description: 'Workflow template deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Template cannot be deleted in current state',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow template not found',
  })
  async deleteWorkflowTemplate(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    try {
      const organizationId = req.headers['x-org-id'];
      
      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      await this.workflowTemplatesService.deleteWorkflowTemplate(id, organizationId);
    } catch (error) {
      throw new BadRequestException(`Failed to delete workflow template: ${error.message}`);
    }
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Clone workflow template',
    description: 'Create a copy of an existing workflow template with all stages and approval gates'
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID to clone' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newName: {
          type: 'string',
          description: 'Optional new name for the cloned template',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Workflow template cloned successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow template not found',
  })
  async cloneWorkflowTemplate(
    @Param('id') id: string,
    @Body() body: { newName?: string },
    @Request() req: any,
  ): Promise<WorkflowTemplateDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;
      
      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.workflowTemplatesService.cloneWorkflowTemplate(
        id,
        organizationId,
        userId,
        body.newName,
      );
    } catch (error) {
      throw new BadRequestException(`Failed to clone workflow template: ${error.message}`);
    }
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Activate workflow template',
    description: 'Change template status from draft to active'
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template activated successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Template cannot be activated in current state',
  })
  async activateWorkflowTemplate(
    @Param('id') id: string,
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
        { status: WorkflowStatus.ACTIVE },
        organizationId,
        userId,
      );
    } catch (error) {
      throw new BadRequestException(`Failed to activate workflow template: ${error.message}`);
    }
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Archive workflow template',
    description: 'Change template status to archived (cannot be modified after archiving)'
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template archived successfully',
    type: WorkflowTemplateDto,
  })
  async archiveWorkflowTemplate(
    @Param('id') id: string,
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
        { status: WorkflowStatus.ARCHIVED },
        organizationId,
        userId,
      );
    } catch (error) {
      throw new BadRequestException(`Failed to archive workflow template: ${error.message}`);
    }
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Set as default template',
    description: 'Set this template as the default workflow template for the organization'
  })
  @ApiParam({ name: 'id', description: 'Workflow template ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow template set as default successfully',
    type: WorkflowTemplateDto,
  })
  async setAsDefaultTemplate(
    @Param('id') id: string,
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
        { isDefault: true },
        organizationId,
        userId,
      );
    } catch (error) {
      throw new BadRequestException(`Failed to set template as default: ${error.message}`);
    }
  }
}
