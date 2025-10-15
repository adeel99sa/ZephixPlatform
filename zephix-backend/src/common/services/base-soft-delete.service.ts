import { Repository, IsNull } from 'typeorm';

type WithSoftDelete = { id: string; deletedAt?: Date | null; deletedById?: string | null };

export class BaseSoftDeleteService<T extends WithSoftDelete> {
  constructor(protected readonly repo: Repository<T>) {}

  async findById(id: string, organizationId?: string): Promise<T | null> {
    const where: any = { id, deletedAt: IsNull() };
    if (organizationId) where.organizationId = organizationId;
    return this.repo.findOne({ where });
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    await this.repo.update(id, { deletedAt: new Date(), deletedById: userId ?? null } as any);
  }

  async restore(id: string): Promise<void> {
    await this.repo.update(id, { deletedAt: null } as any);
  }

  async findAndCount(where: any = {}) {
    return this.repo.findAndCount({ where: { ...where, deletedAt: IsNull() } });
  }
}
