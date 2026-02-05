import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import {
  DocumentLibraryService,
  ListDocsQuery,
} from './document-library.service';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/docs')
@UseGuards(JwtAuthGuard)
export class DocumentLibraryController {
  constructor(private readonly service: DocumentLibraryService) {}

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
    const auth = getAuthContext(req);
    getTemplateCenterScope(auth);
    const query: ListDocsQuery = {
      category,
      search,
      activeOnly: activeOnly === 'false' ? false : true,
    };
    const list = await this.service.listTemplates(query);
    return list.map((d) => ({
      id: d.id,
      docKey: d.docKey,
      name: d.name,
      category: d.category,
      contentType: d.contentType,
      isActive: d.isActive,
    }));
  }
}
