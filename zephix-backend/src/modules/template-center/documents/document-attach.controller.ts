import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { DocumentAttachService } from './document-attach.service';
import { AttachDocumentFromTemplateDto } from './dto/attach-document.dto';

/**
 * TC-B6 — canonical project-level document attach.
 * POST /api/projects/:projectId/documents/from-template
 */
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class DocumentAttachController {
  constructor(private readonly service: DocumentAttachService) {}

  @Post(':projectId/documents/from-template')
  @HttpCode(HttpStatus.CREATED)
  async attachFromTemplate(
    @Param('projectId') projectId: string,
    @Body() dto: AttachDocumentFromTemplateDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    return this.service.attachFromTemplate(
      projectId,
      { docKey: dto.docKey, blocksGateKey: dto.blocksGateKey ?? null },
      auth.userId,
      scope.organizationId,
      scope.workspaceId ?? null,
      auth.platformRole,
    );
  }
}
