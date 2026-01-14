import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagIndex } from '../entities/rag-index.entity';
import { EmbeddingService } from '../../../ai/embedding.service';
import { Task } from '../../tasks/entities/task.entity';
import { Risk } from '../../risks/entities/risk.entity';

/**
 * Phase 8: Knowledge Index Service
 * Indexes text content for RAG (Retrieval-Augmented Generation)
 */
@Injectable()
export class KnowledgeIndexService {
  private readonly logger = new Logger(KnowledgeIndexService.name);

  constructor(
    @InjectRepository(RagIndex)
    private ragIndexRepo: Repository<RagIndex>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Risk)
    private riskRepo: Repository<Risk>,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Index a task
   */
  async indexTask(task: Task): Promise<void> {
    const text = `${task.name}\n${task.description || ''}`.trim();
    if (!text) return;

    try {
      // Generate embedding
      const embeddingResponse = await this.embeddingService.generateEmbedding({
        text,
        model: 'text-embedding-3-large',
      });

      // Check if already indexed
      const existing = await this.ragIndexRepo.findOne({
        where: {
          documentType: 'task',
          documentId: task.id,
          organizationId: task.organizationId,
        },
      });

      if (existing) {
        existing.embedding = embeddingResponse.embedding;
        existing.text = text;
        existing.updatedAt = new Date();
        await this.ragIndexRepo.save(existing);
      } else {
        const index = this.ragIndexRepo.create({
          embedding: embeddingResponse.embedding,
          documentType: 'task',
          documentId: task.id,
          organizationId: task.organizationId,
          workspaceId: (task.project as any)?.workspaceId,
          projectId: task.projectId,
          text,
          metadata: {
            taskStatus: task.status,
            assignedTo: task.assignedTo,
            dueDate: task.dueDate,
          },
        });
        await this.ragIndexRepo.save(index);
      }

      this.logger.debug(`Indexed task ${task.id}`);
    } catch (error) {
      this.logger.error(`Failed to index task ${task.id}:`, error);
    }
  }

  /**
   * Index a risk
   */
  async indexRisk(risk: Risk): Promise<void> {
    const text =
      `${risk.title}\n${risk.description || ''}\n${JSON.stringify(risk.mitigation || {})}`.trim();
    if (!text) return;

    try {
      // Generate embedding
      const embeddingResponse = await this.embeddingService.generateEmbedding({
        text,
        model: 'text-embedding-3-large',
      });

      // Check if already indexed
      const existing = await this.ragIndexRepo.findOne({
        where: {
          documentType: 'risk',
          documentId: risk.id,
          organizationId: risk.organizationId,
        },
      });

      if (existing) {
        existing.embedding = embeddingResponse.embedding;
        existing.text = text;
        existing.updatedAt = new Date();
        await this.ragIndexRepo.save(existing);
      } else {
        const index = this.ragIndexRepo.create({
          embedding: embeddingResponse.embedding,
          documentType: 'risk',
          documentId: risk.id,
          organizationId: risk.organizationId,
          projectId: risk.projectId,
          text,
          metadata: {
            severity: risk.severity,
            type: risk.type,
            status: risk.status,
          },
        });
        await this.ragIndexRepo.save(index);
      }

      this.logger.debug(`Indexed risk ${risk.id}`);
    } catch (error) {
      this.logger.error(`Failed to index risk ${risk.id}:`, error);
    }
  }

  /**
   * Search knowledge index
   */
  async search(
    query: string,
    organizationId: string,
    options?: {
      projectId?: string;
      workspaceId?: string;
      documentTypes?: string[];
      limit?: number;
    },
  ): Promise<RagIndex[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.embeddingService.generateEmbedding({
        text: query,
        model: 'text-embedding-3-large',
      });

      // Build query
      let queryBuilder = this.ragIndexRepo
        .createQueryBuilder('rag')
        .where('rag.organizationId = :orgId', { orgId: organizationId });

      if (options?.projectId) {
        queryBuilder = queryBuilder.andWhere('rag.projectId = :projectId', {
          projectId: options.projectId,
        });
      }

      if (options?.workspaceId) {
        queryBuilder = queryBuilder.andWhere('rag.workspaceId = :workspaceId', {
          workspaceId: options.workspaceId,
        });
      }

      if (options?.documentTypes && options.documentTypes.length > 0) {
        queryBuilder = queryBuilder.andWhere(
          'rag.documentType IN (:...types)',
          {
            types: options.documentTypes,
          },
        );
      }

      // For now, use full-text search since we don't have pgvector
      // In production, use cosine similarity with pgvector
      queryBuilder = queryBuilder
        .andWhere(
          `to_tsvector('english', rag.text) @@ plainto_tsquery('english', :query)`,
          {
            query,
          },
        )
        .orderBy(
          `ts_rank(to_tsvector('english', rag.text), plainto_tsquery('english', :query))`,
          'DESC',
        )
        .limit(options?.limit || 10);

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Failed to search knowledge index:`, error);
      return [];
    }
  }

  /**
   * Remove indexed document
   */
  async removeIndex(documentType: string, documentId: string): Promise<void> {
    await this.ragIndexRepo.delete({
      documentType: documentType as any,
      documentId,
    });
  }
}
