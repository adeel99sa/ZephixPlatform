import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';

/**
 * DOC-TENANT-1: every route now verifies workspace membership via
 * WorkspaceRoleGuardService (the same chain the sibling KPIs routes use). The
 * membership lookup runs through TenantAwareRepository<WorkspaceMember>, which
 * scopes by the caller's org from context — so a workspaceId belonging to
 * another org yields no membership and 403s. Reads require membership;
 * document authoring (create/update/delete) requires task-write (owner or
 * member; viewers stay read-only).
 */
@Controller('work/workspaces/:workspaceId/projects/:projectId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get()
  async list(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    return this.service.list(workspaceId, projectId);
  }

  @Get(':id')
  async get(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    return this.service.get(workspaceId, projectId, id);
  }

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateDocumentDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    return this.service.create(workspaceId, projectId, dto, auth.userId);
  }

  @Patch(':id')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    return this.service.update(workspaceId, projectId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    return this.service.remove(workspaceId, projectId, id);
  }
}
