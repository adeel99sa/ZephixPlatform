import { Controller, Get, Param } from '@nestjs/common';
import { FoldersService } from '../services/folders.service';

@Controller('workspaces/:workspaceId/folders')
export class FoldersController {
  constructor(private readonly service: FoldersService) {}

  @Get()
  async list(@Param('workspaceId') workspaceId: string) {
    return this.service.listByWorkspace(workspaceId);
  }
}
