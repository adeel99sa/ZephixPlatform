import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';

import { Template } from '../entities/template.entity';
import { TemplateBlock } from '../entities/template-block.entity';
import { LegoBlock } from '../entities/lego-block.entity';

type AttachV1Dto = {
  blockId: string;
};

type ReorderV1Dto = {
  order: Array<{ blockId: string; displayOrder: number }>;
};

type PatchConfigV1Dto = {
  config: any;
};

@Injectable()
export class TemplateBlocksService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Template))
    private readonly templateRepo: TenantAwareRepository<Template>,
    @Inject(getTenantAwareRepositoryToken(TemplateBlock))
    private readonly templateBlockRepo: TenantAwareRepository<TemplateBlock>,
    @Inject(getTenantAwareRepositoryToken(LegoBlock))
    private readonly legoBlockRepo: TenantAwareRepository<LegoBlock>,
    private readonly tenantContext: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  private getOrgId(req: Request): string {
    const user: any = (req as any).user;
    const orgId = user?.organizationId || user?.organization_id;
    return orgId || this.tenantContext.assertOrganizationId();
  }

  async attachV1(req: Request, templateId: string, dto: AttachV1Dto) {
    const orgId = this.getOrgId(req);
    if (!dto?.blockId) throw new BadRequestException('blockId is required');

    return this.dataSource.transaction(async (manager) => {
      const t = await manager.getRepository(Template).findOne({
        where: { id: templateId, organizationId: orgId } as any,
      });
      if (!t) throw new NotFoundException('Template not found');
      if (t.archivedAt) throw new BadRequestException('Template is archived');

      const lb = await manager.getRepository(LegoBlock).findOne({
        where: [
          { id: dto.blockId, isSystem: true, organizationId: null } as any,
          { id: dto.blockId, organizationId: orgId } as any,
        ],
      });
      if (!lb) throw new NotFoundException('Block not found');
      if ((lb as any).isActive === false)
        throw new BadRequestException('Block is inactive');

      const maxRow = await manager
        .getRepository(TemplateBlock)
        .createQueryBuilder('tb')
        .select('COALESCE(MAX(tb.displayOrder), 0)', 'max')
        .where('tb.organizationId = :orgId', { orgId })
        .andWhere('tb.templateId = :templateId', { templateId })
        .getRawOne();

      const nextOrder = Number(maxRow?.max || 0) + 1;

      const entity = manager.getRepository(TemplateBlock).create({
        organizationId: orgId,
        templateId,
        blockId: dto.blockId,
        enabled: true,
        displayOrder: nextOrder,
        config: {},
        locked: false,
      } as any);

      try {
        const saved = await manager.getRepository(TemplateBlock).save(entity);
        return saved;
      } catch (e: any) {
        if (
          String(e?.message || '')
            .toLowerCase()
            .includes('uq_template_blocks')
        ) {
          throw new BadRequestException('Block already attached');
        }
        throw e;
      }
    });
  }

  async reorderV1(req: Request, templateId: string, dto: ReorderV1Dto) {
    const orgId = this.getOrgId(req);
    if (!dto?.order || dto.order.length === 0)
      throw new BadRequestException('order is required');

    return this.dataSource.transaction(async (manager) => {
      // Verify template exists and is not locked (defense-in-depth, guard also checks)
      const t = await manager.getRepository(Template).findOne({
        where: { id: templateId, organizationId: orgId } as any,
      });
      if (!t) throw new NotFoundException('Template not found');
      if (t.archivedAt) throw new BadRequestException('Template is archived');

      const rows = await manager.getRepository(TemplateBlock).find({
        where: { organizationId: orgId, templateId } as any,
      });

      if (rows.length === 0) throw new NotFoundException('No blocks found');

      const byId = new Map(rows.map((r) => [r.blockId, r]));
      for (const item of dto.order) {
        if (!byId.has(item.blockId)) {
          throw new BadRequestException('order contains unknown blockId');
        }
      }

      for (const item of dto.order) {
        await manager
          .getRepository(TemplateBlock)
          .createQueryBuilder()
          .update()
          .set({ displayOrder: item.displayOrder } as any)
          .where('organizationId = :orgId', { orgId })
          .andWhere('templateId = :templateId', { templateId })
          .andWhere('blockId = :blockId', { blockId: item.blockId })
          .execute();
      }

      return { ok: true };
    });
  }

  async patchConfigV1(
    req: Request,
    templateId: string,
    blockId: string,
    dto: PatchConfigV1Dto,
  ) {
    const orgId = this.getOrgId(req);

    // Verify template exists and is not locked (defense-in-depth, guard also checks)
    const t = await this.templateRepo.findOne({
      where: { id: templateId, organizationId: orgId } as any,
    });
    if (!t) throw new NotFoundException('Template not found');
    if (t.archivedAt) throw new BadRequestException('Template is archived');

    const row = await this.templateBlockRepo.findOne({
      where: { organizationId: orgId, templateId, blockId } as any,
    });
    if (!row) throw new NotFoundException('Template block not found');
    if (row.locked) throw new ForbiddenException('Block config is locked');

    row.config = dto?.config ?? {};
    await this.templateBlockRepo.save(row as any);
    return { ok: true };
  }

  async detachV1(req: Request, templateId: string, blockId: string) {
    const orgId = this.getOrgId(req);

    // Verify template exists and is not locked (defense-in-depth, guard also checks)
    const t = await this.templateRepo.findOne({
      where: { id: templateId, organizationId: orgId } as any,
    });
    if (!t) throw new NotFoundException('Template not found');
    if (t.archivedAt) throw new BadRequestException('Template is archived');

    const row = await this.templateBlockRepo.findOne({
      where: { organizationId: orgId, templateId, blockId } as any,
    });
    if (!row) throw new NotFoundException('Template block not found');
    if (row.locked) throw new ForbiddenException('Block is locked');

    await this.templateBlockRepo.delete({
      organizationId: orgId,
      templateId,
      blockId,
    } as any);
    return { ok: true };
  }
}
