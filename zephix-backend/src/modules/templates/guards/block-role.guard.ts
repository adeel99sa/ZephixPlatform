import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { LegoBlocksService } from '../services/lego-blocks.service';

@Injectable()
export class BlockRoleGuard implements CanActivate {
  constructor(private readonly blocks: LegoBlocksService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const blockId = req.body?.blockId || (req.params as any)?.blockId;
    if (!blockId) return true;

    const user: any = (req as any).user;
    if (!user) throw new ForbiddenException('Missing user');

    const block = await this.blocks.getByIdForGuard(req, blockId);
    if (!block) return true;

    const minRole = block.minRoleToAttach;
    if (!minRole) return true;

    const ok = await this.blocks.userMeetsMinRole(req, block);
    if (!ok) throw new ForbiddenException('Insufficient role to attach block');

    return true;
  }
}
