import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KpiDefinitionEntity as KpiDefinition } from '../../kpis/entities/kpi-definition.entity';

export interface ListKpisQuery {
  category?: string;
  search?: string;
  activeOnly?: boolean;
}

@Injectable()
export class KpiLibraryService {
  constructor(
    @InjectRepository(KpiDefinition)
    private readonly kpiRepo: Repository<KpiDefinition>,
  ) {}

  async list(query: ListKpisQuery): Promise<KpiDefinition[]> {
    const qb = this.kpiRepo.createQueryBuilder('k');
    if (query.activeOnly !== false) {
      qb.andWhere('k.is_active = :active', { active: true });
    }
    if (query.category) {
      qb.andWhere('k.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(k.name ILIKE :search OR k.kpi_key ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    qb.orderBy('k.category', 'ASC').addOrderBy('k.name', 'ASC');
    return qb.getMany();
  }

  async getByKey(kpiKey: string): Promise<KpiDefinition | null> {
    return this.kpiRepo.findOne({ where: { kpiKey } });
  }

  async getByKeys(kpiKeys: string[]): Promise<KpiDefinition[]> {
    if (kpiKeys.length === 0) return [];
    return this.kpiRepo
      .createQueryBuilder('k')
      .where('k.kpi_key IN (:...keys)', { keys: kpiKeys })
      .getMany();
  }
}
