import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { DocumentChunk } from './document-parser.service';

export interface VectorEmbedding {
  id: string;
  values: number[];
  metadata: {
    content: string;
    type: string;
    source_document_id: string;
    preceding_heading?: string;
    section_level?: number;
    list_type?: string;
    chunk_index: number;
    [key: string]: any;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: {
    content: string;
    type: string;
    source_document_id: string;
    preceding_heading?: string;
    section_level?: number;
    [key: string]: any;
  };
}

export interface SearchQuery {
  query: string;
  filter?: {
    source_document_id?: string;
    type?: string;
    section_level?: number;
  };
  topK?: number;
  includeMetadata?: boolean;
}

@Injectable()
export class VectorDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(VectorDatabaseService.name);
  private pinecone: Pinecone;
  private indexName: string;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.indexName = this.configService.get<string>('PINECONE_INDEX_NAME') || 'zephix-documents';
  }

  async onModuleInit() {
    await this.initializePinecone();
  }

  /**
   * Initialize Pinecone client
   */
  private async initializePinecone() {
    try {
      const apiKey = this.configService.get<string>('PINECONE_API_KEY');
      const environment = this.configService.get<string>('PINECONE_ENVIRONMENT');

      if (!apiKey || !environment) {
        this.logger.warn('Pinecone configuration missing. Vector database features will be disabled.');
        return;
      }

      this.pinecone = new Pinecone({
        apiKey,
      });

      // Test connection by listing indexes
      const indexes = await this.pinecone.listIndexes();
      this.logger.log(`Connected to Pinecone. Available indexes: ${indexes.indexes?.map(i => i.name).join(', ') || 'none'}`);

      // Ensure our index exists
      // Note: Index creation is now handled manually through Pinecone console
      // this.ensureIndexExists();
      this.isConfigured = true;
      
      this.logger.log('Vector database service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Ensure the required index exists
   */
  private async ensureIndexExists() {
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(index => index.name === this.indexName) || false;

      if (!indexExists) {
        this.logger.log(`Creating Pinecone index: ${this.indexName}`);
        
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI text-embedding-3-large dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }
    } catch (error) {
      this.logger.error(`Failed to create/verify index ${this.indexName}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady() {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals

    while (attempts < maxAttempts) {
      try {
        const index = this.pinecone.index(this.indexName);
        const stats = await index.describeIndexStats();
        
        // Check if index is ready (this may vary based on Pinecone API version)
        if (true) { // Assume ready for now
          this.logger.log(`Index ${this.indexName} is ready`);
          return;
        }
        
        this.logger.log(`Waiting for index ${this.indexName} to be ready... (attempt ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
      } catch (error) {
        this.logger.warn(`Error checking index status: ${error.message}`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    throw new Error(`Index ${this.indexName} failed to become ready after ${maxAttempts} attempts`);
  }

  /**
   * Store document chunks as vector embeddings
   */
  async storeDocumentChunks(
    documentId: string,
    chunks: DocumentChunk[],
    embeddings: number[][],
  ): Promise<{ success: boolean; storedCount: number; error?: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Vector database not configured',
        storedCount: 0,
      };
    }

    try {
      this.logger.log(`Storing ${chunks.length} chunks for document ${documentId}`);

      const index = this.pinecone.index(this.indexName);
      const vectors: VectorEmbedding[] = [];

      // Prepare vectors for storage
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        if (!embedding || embedding.length === 0) {
          this.logger.warn(`Skipping chunk ${i} - no embedding available`);
          continue;
        }

        vectors.push({
          id: `${documentId}_chunk_${i}`,
          values: embedding,
          metadata: {
            content: chunk.content,
            type: chunk.type,
            source_document_id: documentId,
            preceding_heading: chunk.metadata.preceding_heading,
            section_level: chunk.metadata.section_level,
            list_type: chunk.metadata.list_type,
            chunk_index: i,
            // filename: chunk.metadata.filename, // Not available in current metadata structure
          },
        });
      }

      if (vectors.length === 0) {
        return {
          success: false,
          error: 'No valid embeddings to store',
          storedCount: 0,
        };
      }

      // Store vectors in batches (Pinecone recommends max 100 per batch)
      const batchSize = 100;
      let storedCount = 0;

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        
        try {
          await index.upsert(batch);
          storedCount += batch.length;
          
          this.logger.log(`Stored batch ${Math.floor(i / batchSize) + 1}: ${batch.length} vectors`);
        } catch (batchError) {
          this.logger.error(`Failed to store batch ${Math.floor(i / batchSize) + 1}:`, batchError.message);
          // Continue with next batch
        }
      }

      this.logger.log(`Successfully stored ${storedCount}/${vectors.length} vectors for document ${documentId}`);

      return {
        success: true,
        storedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to store document chunks: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
        storedCount: 0,
      };
    }
  }

  /**
   * Search for similar content in the vector database
   */
  async searchSimilar(
    queryEmbedding: number[],
    searchQuery: SearchQuery,
  ): Promise<SearchResult[]> {
    if (!this.isConfigured) {
      this.logger.warn('Vector database not configured, returning empty search results');
      return [];
    }

    try {
      const index = this.pinecone.index(this.indexName);
      
      const searchOptions: any = {
        vector: queryEmbedding,
        topK: searchQuery.topK || 10,
        includeMetadata: searchQuery.includeMetadata !== false,
      };

      // Add filters if specified
      if (searchQuery.filter) {
        searchOptions.filter = {};
        
        if (searchQuery.filter.source_document_id) {
          searchOptions.filter.source_document_id = { $eq: searchQuery.filter.source_document_id };
        }
        
        if (searchQuery.filter.type) {
          searchOptions.filter.type = { $eq: searchQuery.filter.type };
        }
        
        if (searchQuery.filter.section_level !== undefined) {
          searchOptions.filter.section_level = { $eq: searchQuery.filter.section_level };
        }
      }

      const searchResponse = await index.query(searchOptions);
      
      const results: SearchResult[] = searchResponse.matches?.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as any,
      })) || [];

      this.logger.log(`Search completed: ${results.length} results found`);
      
      return results;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Delete all vectors for a specific document
   */
  async deleteDocumentVectors(documentId: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Vector database not configured',
        deletedCount: 0,
      };
    }

    try {
      const index = this.pinecone.index(this.indexName);
      
      // Delete vectors by metadata filter
      await index.deleteMany({
        filter: {
          source_document_id: { $eq: documentId },
        },
      });

      this.logger.log(`Deleted all vectors for document ${documentId}`);
      
      return {
        success: true,
        deletedCount: -1, // Pinecone doesn't return exact count
      };
    } catch (error) {
      this.logger.error(`Failed to delete document vectors: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
        deletedCount: 0,
      };
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const index = this.pinecone.index(this.indexName);
      return await index.describeIndexStats();
    } catch (error) {
      this.logger.error(`Failed to get index stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}
