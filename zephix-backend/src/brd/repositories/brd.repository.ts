import { Injectable } from '@nestjs/common';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { BRD, BRDStatus } from '../entities/brd.entity';

export interface BRDListOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  status?: BRDStatus;
  project_id?: string;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface BRDListResult {
  data: BRD[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BRDRepository {
  constructor(
    @InjectRepository(BRD)
    private readonly repository: Repository<BRD>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new BRD with organization isolation
   */
  async create(brdData: Partial<BRD>, organizationId: string): Promise<BRD> {
    const brd = this.repository.create({
      ...brdData,
      organizationId,
    });

    return this.repository.save(brd);
  }

  /**
   * Find BRD by ID with organization isolation
   */
  async findById(id: string, organizationId: string): Promise<BRD | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
      },
    });
  }

  /**
   * Update BRD with organization isolation
   */
  async update(
    id: string,
    organizationId: string,
    updateData: Partial<BRD>,
  ): Promise<BRD | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(BRD)
      .set({
        ...updateData,
        version: () => 'version + 1',
        updated_at: new Date(),
      })
      .where('id = :id AND organizationId = :organizationId', {
        id,
        organizationId,
      })
      .execute();

    if (result.affected === 0) {
      return null;
    }

    return this.findById(id, organizationId);
  }

  /**
   * List BRDs with tenant isolation, filtering, pagination, and sorting
   */
  async findMany(options: BRDListOptions): Promise<BRDListResult> {
    const {
      organizationId,
      page = 1,
      limit = 20,
      status,
      project_id,
      search,
      sort = 'updated_at',
      order = 'DESC',
    } = options;

    const queryBuilder = this.createBaseQueryBuilder().where(
      'brd.organizationId = :organizationId',
      { organizationId },
    );

    // Apply filters
    if (status) {
      queryBuilder.andWhere('brd.status = :status', { status });
    }

    if (project_id) {
      queryBuilder.andWhere('brd.project_id = :project_id', { project_id });
    }

    // Apply search using full-text search vector
    if (search) {
      queryBuilder.andWhere(
        `(
          brd.search_vector @@ plainto_tsquery('english', :search) OR
          brd.payload::text ILIKE :searchPattern
        )`,
        {
          search,
          searchPattern: `%${search}%`,
        },
      );
    }

    // Apply sorting
    const sortField = this.validateSortField(sort);
    queryBuilder.orderBy(`brd.${sortField}`, order);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete BRD with organization isolation
   */
  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.repository.delete({
      id,
      organizationId,
    });

    return (result.affected || 0) > 0;
  }

  /**
   * Change BRD status with workflow validation
   */
  async changeStatus(
    id: string,
    organizationId: string,
    newStatus: BRDStatus,
  ): Promise<BRD | null> {
    const brd = await this.findById(id, organizationId);
    if (!brd) {
      return null;
    }

    if (!brd.canTransitionTo(newStatus)) {
      throw new Error(`Cannot transition from ${brd.status} to ${newStatus}`);
    }

    return this.update(id, organizationId, { status: newStatus });
  }

  /**
   * Get BRD statistics for tenant
   */
  async getStatistics(organizationId: string): Promise<{
    total: number;
    by_status: Record<BRDStatus, number>;
    recent_activity: BRD[];
  }> {
    // Total count
    const total = await this.repository.count({
      where: { organizationId },
    });

    // Count by status
    const statusCounts = await this.repository
      .createQueryBuilder('brd')
      .select('brd.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('brd.organizationId = :organizationId', { organizationId })
      .groupBy('brd.status')
      .getRawMany();

    const by_status = Object.values(BRDStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<BRDStatus, number>,
    );

    statusCounts.forEach(({ status, count }) => {
      by_status[status as BRDStatus] = parseInt(count, 10);
    });

    // Recent activity (last 10 updated BRDs)
    const recent_activity = await this.repository.find({
      where: { organizationId },
      order: { updated_at: 'DESC' },
      take: 10,
    });

    return {
      total,
      by_status,
      recent_activity,
    };
  }

  /**
   * Search BRDs using full-text search
   */
  async search(
    organizationId: string,
    query: string,
    limit = 10,
  ): Promise<BRD[]> {
    return this.repository
      .createQueryBuilder('brd')
      .where('brd.organizationId = :organizationId', { organizationId })
      .andWhere('brd.search_vector @@ plainto_tsquery(:query)', { query })
      .orderBy('ts_rank(brd.search_vector, plainto_tsquery(:query))', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Update search vector for a BRD
   */
  async updateSearchVector(id: string, organizationId: string): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE brds 
      SET search_vector = to_tsvector('english', 
        COALESCE(payload->>'metadata'->>'title', '') || ' ' ||
        COALESCE(payload->>'metadata'->>'summary', '') || ' ' ||
        COALESCE(payload->>'businessContext'->>'problemStatement', '') || ' ' ||
        COALESCE(payload->>'businessContext'->>'businessObjective', '') || ' ' ||
        COALESCE(payload->>'metadata'->>'industry', '') || ' ' ||
        COALESCE(payload->>'metadata'->>'department', '')
      )
      WHERE id = $1 AND organizationId = $2
      `,
      [id, organizationId],
    );
  }

  /**
   * Create base query builder with common selections
   */
  private createBaseQueryBuilder(): SelectQueryBuilder<BRD> {
    return this.repository.createQueryBuilder('brd');
  }

  /**
   * Validate sort field to prevent SQL injection
   */
  private validateSortField(sort: string): string {
    const allowedFields = ['created_at', 'updated_at', 'version', 'status'];
    return allowedFields.includes(sort) ? sort : 'updated_at';
  }

  /**
   * Bulk operations for admin/maintenance
   */
  async bulkUpdateStatus(
    ids: string[],
    organizationId: string,
    newStatus: BRDStatus,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(BRD)
      .set({
        status: newStatus,
        updated_at: new Date(),
      })
      .where('id IN (:...ids) AND organizationId = :organizationId', {
        ids,
        organizationId,
      })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get BRDs by project with tenant isolation
   */
  async findByProject(
    project_id: string,
    organizationId: string,
  ): Promise<BRD[]> {
    return this.repository.find({
      where: {
        project_id,
        organizationId,
      },
      order: {
        updated_at: 'DESC',
      },
    });
  }

  /**
   * Archive old BRDs (soft delete equivalent)
   */
  async archiveOldBRDs(
    organizationId: string,
    daysOld: number,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository
      .createQueryBuilder()
      .update(BRD)
      .set({
        status: BRDStatus.DRAFT, // Or create an ARCHIVED status
        updated_at: new Date(),
      })
      .where(
        'organizationId = :organizationId AND status = :status AND updated_at < :cutoffDate',
        {
          organizationId,
          status: BRDStatus.DRAFT,
          cutoffDate,
        },
      )
      .execute();

    return result.affected || 0;
  }
}
