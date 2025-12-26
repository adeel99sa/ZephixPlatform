import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { TemplatesService } from '../services/templates.service';

@Injectable()
export class TemplateLockGuard implements CanActivate {
  constructor(private readonly templates: TemplatesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const templateId = (req.params as any).id;
    if (!templateId) return true;

    const tpl = await this.templates.getByIdForGuard(req, templateId);
    if (!tpl) return true;

    if (tpl.lockState === 'LOCKED') {
      throw new ForbiddenException('Template is locked');
    }
    return true;
  }
}
