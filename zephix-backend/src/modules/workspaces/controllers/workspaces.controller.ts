import { Controller, Get, Param, Req } from '@nestjs/common';
import { WorkspacesService } from '../services/workspaces.service';

@Controller('workspaces') // global 'api' prefix already applied
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  async list(@Req() req: any) {
    const organizationId = req.user?.organizationId; // guarded routes
    return this.service.findAllByOrg(organizationId);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    return this.service.findOne(id, organizationId);
  }
}
