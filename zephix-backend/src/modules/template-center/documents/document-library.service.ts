import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocTemplate } from './entities/doc-template.entity';

export interface ListDocsQuery {
  category?: string;
  search?: string;
  activeOnly?: boolean;
}

@Injectable()
export class DocumentLibraryService {
  constructor(
    @InjectRepository(DocTemplate)
    private readonly docTemplateRepo: Repository<DocTemplate>,
  ) {}

  async listTemplates(query: ListDocsQuery): Promise<DocTemplate[]> {
    const qb = this.docTemplateRepo.createQueryBuilder('d');
    if (query.activeOnly !== false) {
      qb.andWhere('d.is_active = :active', { active: true });
    }
    if (query.category) {
      qb.andWhere('d.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(d.name ILIKE :search OR d.doc_key ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    qb.orderBy('d.category', 'ASC').addOrderBy('d.name', 'ASC');
    return qb.getMany();
  }

  async getByKey(docKey: string): Promise<DocTemplate | null> {
    return this.docTemplateRepo.findOne({ where: { docKey } });
  }

  async getByKeys(docKeys: string[]): Promise<DocTemplate[]> {
    if (docKeys.length === 0) return [];
    return this.docTemplateRepo
      .createQueryBuilder('d')
      .where('d.doc_key IN (:...keys)', { keys: docKeys })
      .getMany();
  }
}
