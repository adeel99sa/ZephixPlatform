import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { EntityRelationService } from '../services/entity-relation.service';
import { CreateEntityLinkDto } from '../dto/create-entity-link.dto';
import { GetEntityLinksQuery } from '../dto/get-entity-links.query';

@ApiTags('Entity Links')
@Controller('workspaces/:wsId/entity-links')
@UseGuards(JwtAuthGuard)
export class EntityLinksController {
  constructor(private readonly service: EntityRelationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a cross-entity link (TASK↔RISK, TASK↔ARTIFACT, RISK↔ARTIFACT)' })
  async create(
    @Param('wsId') wsId: string,
    @Body() dto: CreateEntityLinkDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    return this.service.create(
      { userId: auth.userId, organizationId: auth.organizationId },
      wsId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List entity links for a workspace, optionally filtered by entity' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['TASK', 'RISK', 'ARTIFACT'] })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  async findAll(
    @Param('wsId') wsId: string,
    @Query() query: GetEntityLinksQuery,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    return this.service.findForWorkspace(
      wsId,
      auth.organizationId,
      query.entityType,
      query.entityId,
    );
  }

  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an entity link by ID' })
  @ApiParam({ name: 'linkId', description: 'UUID of the entity link to delete' })
  async remove(
    @Param('wsId') wsId: string,
    @Param('linkId') linkId: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.service.remove(linkId, wsId, auth.organizationId);
  }
}
