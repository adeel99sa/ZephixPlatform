import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Req,
  Param,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { AttachmentsService } from '../services/attachments.service';
import { AttachmentParentType } from '../entities/attachment.entity';
import { RequireEntitlement } from '../../billing/entitlements/require-entitlement.guard';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

const VALID_PARENT_TYPES: AttachmentParentType[] = ['work_task', 'work_risk', 'doc', 'comment'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('work/workspaces/:workspaceId/attachments')
@UseGuards(JwtAuthGuard)
@RequireEntitlement('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  /**
   * POST /work/workspaces/:wsId/attachments/presign
   * Creates pending attachment + returns presigned PUT URL
   */
  @Post('presign')
  async createPresign(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: {
      parentType: AttachmentParentType;
      parentId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    const auth = getAuthContext(req);
    this.validateWorkspaceId(workspaceId);
    this.validateParentType(body.parentType);

    if (!body.fileName) throw new BadRequestException('fileName is required');
    if (!body.parentId) throw new BadRequestException('parentId is required');
    if (!body.sizeBytes || body.sizeBytes <= 0) throw new BadRequestException('sizeBytes must be > 0');

    const result = await this.attachmentsService.createPresign(auth, workspaceId, body);
    return this.responseService.success(result);
  }

  /**
   * POST /work/workspaces/:wsId/attachments/:id/complete
   * Marks attachment as uploaded after client-side PUT succeeds
   */
  @Post(':id/complete')
  async completeUpload(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { checksumSha256?: string },
  ) {
    const auth = getAuthContext(req);
    this.validateWorkspaceId(workspaceId);

    const result = await this.attachmentsService.completeUpload(
      auth,
      workspaceId,
      id,
      body?.checksumSha256,
    );
    return this.responseService.success(result);
  }

  /**
   * GET /work/workspaces/:wsId/attachments?parentType=work_task&parentId=xxx
   * Lists uploaded attachments for a parent item
   */
  @Get()
  async list(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Query('parentType') parentType: AttachmentParentType,
    @Query('parentId') parentId: string,
  ) {
    const auth = getAuthContext(req);
    this.validateWorkspaceId(workspaceId);
    this.validateParentType(parentType);
    if (!parentId) throw new BadRequestException('parentId query param is required');

    const attachments = await this.attachmentsService.listForParent(
      auth,
      workspaceId,
      parentType,
      parentId,
    );
    return this.responseService.success(attachments);
  }

  /**
   * GET /work/workspaces/:wsId/attachments/:id/download
   * Returns short-lived presigned GET URL
   */
  @Get(':id/download')
  async download(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    const auth = getAuthContext(req);
    this.validateWorkspaceId(workspaceId);

    const result = await this.attachmentsService.getDownloadUrl(auth, workspaceId, id);
    return this.responseService.success(result);
  }

  /**
   * PATCH /work/workspaces/:wsId/attachments/:id/retention
   * Override retention policy for a single attachment.
   * Access: ADMIN, workspace_owner, or delivery_owner only.
   */
  @Patch(':id/retention')
  async updateRetention(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { retentionDays: number | null },
  ) {
    const auth = getAuthContext(req);
    this.validateWorkspaceId(workspaceId);

    // Role gate: ADMIN bypasses, otherwise check workspace role
    const role = auth.platformRole?.toUpperCase();
    if (role !== 'ADMIN') {
      const wsRole = await this.workspaceRoleGuard.getWorkspaceRole(workspaceId, auth.userId);
      if (!wsRole || !['workspace_owner', 'delivery_owner'].includes(wsRole)) {
        throw new ForbiddenException('Only ADMIN, workspace_owner, or delivery_owner can update retention');
      }
    }

    const result = await this.attachmentsService.updateRetention(
      auth,
      workspaceId,
      id,
      body.retentionDays,
    );
    return this.responseService.success(result);
  }

  /**
   * DELETE /work/workspaces/:wsId/attachments/:id
   * Soft-deletes attachment and cleans up storage
   */
  @Delete(':id')
  async remove(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    const auth = getAuthContext(req);
    this.validateWorkspaceId(workspaceId);

    await this.attachmentsService.deleteAttachment(auth, workspaceId, id);
    return this.responseService.success({ deleted: true });
  }

  // ── Validation helpers ───────────────────────────────────────────────

  private validateWorkspaceId(id: string): void {
    if (!UUID_RE.test(id)) {
      throw new BadRequestException('Invalid workspaceId format');
    }
  }

  private validateParentType(type: string): void {
    if (!VALID_PARENT_TYPES.includes(type as AttachmentParentType)) {
      throw new BadRequestException(
        `Invalid parentType. Allowed: ${VALID_PARENT_TYPES.join(', ')}`,
      );
    }
  }
}
