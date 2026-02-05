import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocsService } from './docs.service';
import { CreateDocDto } from './dto/create-doc.dto';
import { UpdateDocDto } from './dto/update-doc.dto';
import { formatResponse } from '../../shared/helpers/response.helper';
import { UserJwt } from '../auth/types/user-jwt.interface';

@Controller()
@UseGuards(JwtAuthGuard)
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Post('workspaces/:workspaceId/docs')
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() createDocDto: CreateDocDto,
    @CurrentUser() user: UserJwt,
    @Req() req: Request,
  ) {
    const doc = await this.docsService.create(
      workspaceId,
      createDocDto,
      user.id,
      user.organizationId,
      user.role || user.platformRole || 'viewer',
    );

    return formatResponse({ docId: doc.id });
  }

  @Get('docs/:docId')
  async findOne(@Param('docId') docId: string, @CurrentUser() user: UserJwt) {
    const doc = await this.docsService.findOne(
      docId,
      user.id,
      user.organizationId,
      user.role || user.platformRole || 'viewer',
    );

    return formatResponse({
      id: doc.id,
      workspaceId: doc.workspaceId,
      title: doc.title,
      content: doc.content || '',
      createdAt: doc.createdAt.toISOString(),
    });
  }

  @Patch('docs/:docId')
  async update(
    @Param('docId') docId: string,
    @Body() updateDocDto: UpdateDocDto,
    @CurrentUser() user: UserJwt,
  ) {
    const doc = await this.docsService.update(
      docId,
      updateDocDto,
      user.id,
      user.organizationId,
      user.role || user.platformRole || 'viewer',
    );

    return formatResponse({
      id: doc.id,
      workspaceId: doc.workspaceId,
      title: doc.title,
      content: doc.content || '',
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    });
  }
}
