import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentChunk } from './document-parser.service';

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface BatchEmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openaiApiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.defaultModel = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-large';
    this.baseUrl = this.configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.openaiApiKey;
  }

  /**
   * Generate a single embedding
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      this.logger.debug(`Generating embedding for text (${request.text.length} chars)`);

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: request.text,
          model: request.model || this.defaultModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      const embeddingResponse: EmbeddingResponse = {
        embedding: data.data[0].embedding,
        model: data.model,
        usage: {
          prompt_tokens: data.usage.prompt_tokens,
          total_tokens: data.usage.total_tokens,
        },
      };

      this.logger.debug(`Generated embedding successfully (${embeddingResponse.embedding.length} dimensions)`);
      
      return embeddingResponse;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      this.logger.debug(`Generating batch embeddings for ${request.texts.length} texts`);

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: request.texts,
          model: request.model || this.defaultModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      const batchResponse: BatchEmbeddingResponse = {
        embeddings: data.data.map((item: any) => item.embedding),
        model: data.model,
        usage: {
          prompt_tokens: data.usage.prompt_tokens,
          total_tokens: data.usage.total_tokens,
        },
      };

      this.logger.debug(`Generated batch embeddings successfully (${batchResponse.embeddings.length} embeddings)`);
      
      return batchResponse;
    } catch (error) {
      this.logger.error(`Failed to generate batch embeddings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate embeddings for document chunks
   */
  async generateChunkEmbeddings(chunks: DocumentChunk[]): Promise<number[][]> {
    if (chunks.length === 0) {
      return [];
    }

    try {
      this.logger.log(`Generating embeddings for ${chunks.length} document chunks`);

      // Extract text content from chunks
      const texts = chunks.map(chunk => chunk.content);
      
      // Generate embeddings in batches to avoid rate limits
      const batchSize = 100; // OpenAI allows up to 100 inputs per request
      const embeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        this.logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} texts`);
        
        const batchResponse = await this.generateBatchEmbeddings({ texts: batch });
        embeddings.push(...batchResponse.embeddings);
        
        // Add small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.log(`Successfully generated ${embeddings.length} embeddings`);
      
      return embeddings;
    } catch (error) {
      this.logger.error(`Failed to generate chunk embeddings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate embedding for a single chunk
   */
  async generateChunkEmbedding(chunk: DocumentChunk): Promise<number[]> {
    const response = await this.generateEmbedding({ text: chunk.content });
    return response.embedding;
  }

  /**
   * Get service configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean;
    model: string;
    hasApiKey: boolean;
  } {
    return {
      isConfigured: this.isConfigured(),
      model: this.defaultModel,
      hasApiKey: !!this.openaiApiKey,
    };
  }

  /**
   * Validate text length for embedding
   */
  validateTextForEmbedding(text: string): { valid: boolean; error?: string } {
    const maxLength = 8192; // OpenAI text-embedding-3-large token limit
    
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text cannot be empty' };
    }
    
    if (text.length > maxLength) {
      return { valid: false, error: `Text exceeds maximum length of ${maxLength} characters` };
    }
    
    return { valid: true };
  }

  /**
   * Truncate text to fit embedding limits
   */
  truncateTextForEmbedding(text: string, maxLength: number = 8000): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Try to truncate at sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length <= maxLength) {
        truncated += sentence;
      } else {
        break;
      }
    }
    
    // If no sentences fit, truncate at word boundaries
    if (!truncated) {
      const words = text.split(' ');
      for (const word of words) {
        if ((truncated + ' ' + word).length <= maxLength) {
          truncated += (truncated ? ' ' : '') + word;
        } else {
          break;
        }
      }
    }
    
    return truncated || text.substring(0, maxLength);
  }
}
