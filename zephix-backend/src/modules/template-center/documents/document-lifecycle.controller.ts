import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentTransitionDto } from './dto/document-transition.dto';
import { UpdateDocumentAssigneesDto } from './dto/update-document-assignees.dto';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/projects')
@UseGuards(JwtAuthGuard)
export class DocumentLifecycleController {
  constructor(private readonly service: DocumentLifecycleService) {}

  @Get(':projectId/documents')
  async listDocuments(
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.listProjectDocuments(
      projectId,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
  }

  @Get(':projectId/documents/:documentId/history')
  async getDocumentHistory(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.getHistory(
      projectId,
      documentId,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
  }

  @Get(':projectId/documents/:documentId')
  async getDocument(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.getLatest(
      projectId,
      documentId,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
  }

  @Patch(':projectId/documents/:documentId/assignees')
  async updateAssignees(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentAssigneesDto,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.assign(
      projectId,
      documentId,
      { ownerUserId: dto.ownerUserId, reviewerUserId: dto.reviewerUserId },
      auth.userId,
      scope.organizationId,
      scope.workspaceId ?? null,
    );
  }

  @Post(':projectId/documents/:documentId/transition')
  async transition(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: DocumentTransitionDto,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const isPm =
      auth.platformRole === 'ADMIN' || auth.platformRole === 'MEMBER'; // simplified: PM can mark complete
    return this.service.transition(
      projectId,
      documentId,
      dto,
      auth.userId,
      auth.organizationId,
      auth.workspaceId ?? null,
      isPm,
    );
  }
}
