import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto, MoveProjectDto, BulkMoveDto } from './dto';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@Body() dto: CreateFolderDto, @Request() req) {
    return this.foldersService.create(dto, req.user.id, req.user.organizationId);
  }

  @Get('workspace/:workspaceId/tree')
  getTree(@Param('workspaceId') workspaceId: string, @Request() req) {
    return this.foldersService.findTree(workspaceId, req.user.organizationId);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string, @Request() req) {
    return this.foldersService.getDashboard(id, req.user.organizationId);
  }

  @Post('move-project')
  moveProject(@Body() dto: MoveProjectDto, @Request() req) {
    return this.foldersService.moveProject(dto, req.user.organizationId);
  }

  @Post('bulk-move')
  bulkMove(@Body() dto: BulkMoveDto, @Request() req) {
    return this.foldersService.bulkMoveProjects(
      dto.projectIds,
      dto.folderId,
      req.user.organizationId
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFolderDto, @Request() req) {
    return this.foldersService.update(id, dto, req.user.organizationId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.foldersService.delete(id, req.user.id, req.user.organizationId);
  }
}
