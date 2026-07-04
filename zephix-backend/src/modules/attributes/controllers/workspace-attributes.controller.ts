import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AttributeDefinitionsService } from '../services/attribute-definitions.service';
import { AttributeValuesService } from '../services/attribute-values.service';
import { CreateAttributeDefinitionDto } from '../dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from '../dto/update-attribute-definition.dto';

type UserJwt = { id: string; organizationId: string; role: string };

@ApiTags('Attributes — Workspace')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('workspaces/:wsId/attributes')
@UseGuards(JwtAuthGuard)
export class WorkspaceAttributesController {
  constructor(
    private readonly definitionsService: AttributeDefinitionsService,
    private readonly valuesService: AttributeValuesService,
  ) {}

  /**
   * Returns definitions available to this workspace:
   * SYSTEM (enabled via workspace_enabled_attributes) + ORG + WORKSPACE.
   * Optional ?attachedTo=template&refId=<uuid> returns only attached ones.
   */
  @Get('available')
  @ApiOperation({ summary: 'Get definitions available to this workspace' })
  @ApiQuery({ name: 'attachedTo', required: false, enum: ['template', 'project'] })
  @ApiQuery({ name: 'refId', required: false, type: String })
  findAvailable(
    @Param('wsId') wsId: string,
    @CurrentUser() user: UserJwt,
    @Query('attachedTo') attachedTo?: 'template' | 'project',
    @Query('refId') refId?: string,
  ) {
    return this.definitionsService.findAvailable(wsId, user.organizationId, {
      attachedTo,
      refId,
    });
  }

  @Get('definitions')
  @ApiOperation({ summary: 'Get WORKSPACE-scoped definitions for this workspace' })
  findAll(@Param('wsId') wsId: string, @CurrentUser() user: UserJwt) {
    return this.definitionsService.findWorkspaceScoped(wsId, user.organizationId);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create a WORKSPACE-scoped attribute definition' })
  create(
    @Param('wsId') wsId: string,
    @Body() dto: CreateAttributeDefinitionDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.definitionsService.createWorkspaceScoped(
      dto,
      wsId,
      user.organizationId,
      user.id,
    );
  }

  @Patch('definitions/:defId')
  @ApiOperation({ summary: 'Update an attribute definition (authority enforced)' })
  update(
    @Param('wsId') wsId: string,
    @Param('defId') defId: string,
    @Body() dto: UpdateAttributeDefinitionDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.definitionsService.update(defId, dto, {
      userId: user.id,
      orgId: user.organizationId,
      orgRole: user.role,
      wsId,
    });
  }

  @Delete('definitions/:defId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attribute definition (authority enforced)' })
  async remove(
    @Param('wsId') wsId: string,
    @Param('defId') defId: string,
    @CurrentUser() user: UserJwt,
  ) {
    await this.definitionsService.remove(defId, {
      userId: user.id,
      orgId: user.organizationId,
      orgRole: user.role,
      wsId,
    });
  }

  // ── Batch attribute values read ───────────────────────────────────────────

  @Get('values')
  @ApiOperation({ summary: 'Batch read attribute values for up to 200 tasks' })
  @ApiQuery({
    name: 'taskIds',
    required: true,
    type: String,
    description: 'Comma-separated task UUIDs (max 200)',
  })
  findValuesForTasks(
    @Param('wsId') wsId: string,
    @CurrentUser() user: UserJwt,
    @Query('taskIds') taskIds: string,
  ) {
    const ids = taskIds
      ? taskIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    return this.valuesService.findAllForTasks(ids, wsId, user.organizationId);
  }

  // ── Template attachment sub-routes ────────────────────────────────────────

  @Get('templates/:templateId/attachments')
  @ApiOperation({ summary: 'List attribute definitions attached to a template' })
  findTemplateAttachments(@Param('templateId') templateId: string) {
    return this.definitionsService.findTemplateAttachments(templateId);
  }

  @Post('templates/:templateId/attachments')
  @ApiOperation({ summary: 'Attach a definition to a template' })
  attachToTemplate(
    @Param('wsId') wsId: string,
    @Param('templateId') templateId: string,
    @Body() body: { defId: string; locked?: boolean; displayOrder?: number },
    @CurrentUser() user: UserJwt,
  ) {
    return this.definitionsService.attachToTemplate(
      templateId,
      body.defId,
      { locked: body.locked, displayOrder: body.displayOrder },
      { userId: user.id, orgId: user.organizationId, orgRole: user.role, wsId },
    );
  }

  @Patch('templates/:templateId/attachments/:defId')
  @ApiOperation({ summary: 'Update lock/order on a template attachment' })
  updateTemplateAttachment(
    @Param('wsId') wsId: string,
    @Param('templateId') templateId: string,
    @Param('defId') defId: string,
    @Body() body: { locked?: boolean; displayOrder?: number },
    @CurrentUser() user: UserJwt,
  ) {
    return this.definitionsService.updateTemplateAttachment(
      templateId,
      defId,
      body,
      { userId: user.id, orgId: user.organizationId, orgRole: user.role, wsId },
    );
  }

  @Delete('templates/:templateId/attachments/:defId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach a definition from a template (locked → 403)' })
  async detachFromTemplate(
    @Param('wsId') wsId: string,
    @Param('templateId') templateId: string,
    @Param('defId') defId: string,
    @CurrentUser() user: UserJwt,
  ) {
    await this.definitionsService.detachFromTemplate(templateId, defId, {
      userId: user.id,
      orgId: user.organizationId,
      orgRole: user.role,
      wsId,
    });
  }
}
