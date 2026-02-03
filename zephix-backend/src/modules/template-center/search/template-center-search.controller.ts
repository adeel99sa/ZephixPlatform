import { Controller, Get, Query, Req, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { TemplateCenterSearchService } from './template-center-search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/search')
@UseGuards(JwtAuthGuard)
export class TemplateCenterSearchController {
  constructor(private readonly service: TemplateCenterSearchService) {}

  @Get()
  async search(
    @Query() query: SearchQueryDto,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth, query.workspaceId);
    const context = query.context as string | undefined;
    const q = query.q?.trim() ?? '';
    if (!q && context !== 'browse') {
      throw new BadRequestException('q is required unless context is browse');
    }
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 50);
    const results = await this.service.search(q, context as any, limit, scope);
    return results;
  }
}
