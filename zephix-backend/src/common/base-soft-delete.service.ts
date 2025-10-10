import { Repository, FindOptionsWhere, IsNull, Not, In } from 'typeorm';

export abstract class BaseSoftDeleteService<T> {
  constructor(protected repository: Repository<T>) {}

  // Override default find to exclude soft-deleted
  async find(options?: any): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: {
        ...options?.where,
        deletedAt: IsNull()
      }
    });
  }

  async findOne(options: any): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: {
        ...options?.where,
        deletedAt: IsNull()
      }
    });
  }

  async findAndCount(options?: any): Promise<[T[], number]> {
    return this.repository.findAndCount({
      ...options,
      where: {
        ...options?.where,
        deletedAt: IsNull()
      }
    });
  }

  async count(options?: any): Promise<number> {
    return this.repository.count({
      ...options,
      where: {
        ...options?.where,
        deletedAt: IsNull()
      }
    });
  }

  // Soft delete
  async softDelete(id: string, userId: string): Promise<void> {
    await this.repository.update(id, {
      deletedAt: new Date(),
      deletedBy: userId
    } as any);
  }

  async bulkSoftDelete(ids: string[], userId: string): Promise<void> {
    await this.repository.update(
      { id: In(ids) } as any,
      {
        deletedAt: new Date(),
        deletedBy: userId
      } as any
    );
  }

  // Restore from trash
  async restore(id: string): Promise<void> {
    await this.repository.update(id, {
      deletedAt: null,
      deletedBy: null
    } as any);
  }

  async bulkRestore(ids: string[]): Promise<void> {
    await this.repository.update(
      { id: In(ids) } as any,
      {
        deletedAt: null,
        deletedBy: null
      } as any
    );
  }

  // Permanent delete (admin only)
  async permanentDelete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async bulkPermanentDelete(ids: string[]): Promise<void> {
    await this.repository.delete({ id: In(ids) } as any);
  }

  // Get trash items
  async findDeleted(organizationId: string): Promise<T[]> {
    return this.repository.find({
      where: {
        organizationId,
        deletedAt: Not(IsNull())
      } as any,
      order: {
        deletedAt: 'DESC'
      } as any
    });
  }

  // Check if item exists and is not soft-deleted
  async exists(id: string, organizationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        id,
        organizationId,
        deletedAt: IsNull()
      } as any
    });
    return count > 0;
  }

  // Get item by ID (excluding soft-deleted)
  async findById(id: string, organizationId: string): Promise<T | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: IsNull()
      } as any
    });
  }

  // Get all items for organization (excluding soft-deleted)
  async findByOrganization(organizationId: string, options?: any): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: {
        ...options?.where,
        organizationId,
        deletedAt: IsNull()
      }
    });
  }
}

