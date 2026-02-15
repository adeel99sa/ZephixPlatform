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
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';

@Controller('work/workspaces/:workspaceId/projects/:projectId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.service.list(workspaceId, projectId);
  }

  @Get(':id')
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(workspaceId, projectId, id);
  }

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateDocumentDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    return this.service.create(workspaceId, projectId, dto, auth.userId);
  }

  @Patch(':id')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(workspaceId, projectId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(workspaceId, projectId, id);
  }
}
