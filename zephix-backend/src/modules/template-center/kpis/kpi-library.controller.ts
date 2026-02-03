import { Controller, Get, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { KpiLibraryService, ListKpisQuery } from './kpi-library.service';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/kpis')
@UseGuards(JwtAuthGuard)
export class KpiLibraryController {
  constructor(private readonly service: KpiLibraryService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
    @Req() req?: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req!);
    getTemplateCenterScope(auth);
    const query: ListKpisQuery = {
      category,
      search,
      activeOnly: activeOnly === 'false' ? false : true,
    };
    const list = await this.service.list(query);
    return list.map((k) => ({
      id: k.id,
      kpiKey: k.kpiKey,
      name: k.name,
      category: k.category,
      unit: k.unit,
      direction: k.direction,
      rollupMethod: k.rollupMethod,
      timeWindow: k.timeWindow,
      isActive: k.isActive,
    }));
  }
}
