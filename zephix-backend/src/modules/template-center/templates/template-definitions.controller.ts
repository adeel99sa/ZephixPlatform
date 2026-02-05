import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { getTemplateCenterScope } from '../common/template-center-scope.util';
import { TemplateDefinitionsService } from './template-definitions.service';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { isTemplateCenterEnabled } from '../template-center.flags';

@Controller('template-center/templates')
@UseGuards(JwtAuthGuard)
export class TemplateDefinitionsController {
  constructor(private readonly service: TemplateDefinitionsService) {}

  @Get()
  async list(@Query() query: ListTemplatesQueryDto, @Req() req: AuthRequest) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth, query.workspaceId);
    const { definitions, latestVersions } = await this.service.list(
      {
        scope: query.scope,
        search: query.search,
        category: query.category,
        workspaceId: scope.workspaceId ?? undefined,
      },
      scope.organizationId,
      scope.workspaceId ?? undefined,
    );
    return definitions.map((d) => {
      const latest = latestVersions.get(d.id);
      return {
        id: d.id,
        scope: d.scope,
        orgId: d.orgId,
        workspaceId: d.workspaceId,
        templateKey: d.templateKey,
        name: d.name,
        description: d.description,
        category: d.category,
        isPrebuilt: d.isPrebuilt,
        isAdminDefault: d.isAdminDefault,
        latestVersion: latest
          ? { version: latest.version, status: latest.status }
          : null,
      };
    });
  }

  @Get(':templateKey')
  async getByKey(
    @Param('templateKey') templateKey: string,
    @Req() req: AuthRequest,
  ) {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }
    const auth = getAuthContext(req);
    const scope = getTemplateCenterScope(auth);
    const { definition, versions } = await this.service.getByKey(
      templateKey,
      scope.organizationId,
      scope.workspaceId ?? undefined,
    );
    return {
      definition: {
        id: definition.id,
        scope: definition.scope,
        orgId: definition.orgId,
        workspaceId: definition.workspaceId,
        templateKey: definition.templateKey,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        isPrebuilt: definition.isPrebuilt,
        isAdminDefault: definition.isAdminDefault,
      },
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        publishedAt: v.publishedAt,
        changelog: v.changelog,
      })),
    };
  }
}
