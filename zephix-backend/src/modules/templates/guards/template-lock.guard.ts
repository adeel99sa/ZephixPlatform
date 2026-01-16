import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { TemplatesService } from '../services/templates.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Template } from '../entities/template.entity';

@Injectable()
export class TemplateLockGuard implements CanActivate {
  constructor(
    private readonly templates: TemplatesService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const templateId = (req.params as any).id;
    if (!templateId) return true;

    // Load template directly using auth context to avoid req dependency
    const auth = getAuthContext(req);
    const tpl = await this.dataSource.getRepository(Template).findOne({
      where: [
        { id: templateId, organizationId: auth.organizationId },
        { id: templateId, templateScope: 'SYSTEM', organizationId: null },
      ],
      select: ['id', 'lockState'],
    });

    if (!tpl) return true;

    if (tpl.lockState === 'LOCKED') {
      throw new ForbiddenException('Template is locked');
    }
    return true;
  }
}
