import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { DocumentParserService, ParsedDocument } from './document-parser.service';
import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService } from './vector-database.service';

export interface DocumentProcessingJob {
  documentId: string;
  filename: string;
  fileBuffer: Buffer;
  organizationId: string;
  userId: string;
}

export interface DocumentProcessingResult {
  success: boolean;
  documentId: string;
  parsedDocument?: ParsedDocument;
  vectorCount?: number;
  error?: string;
  processingTime: number;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: DocumentProcessingResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DocumentProcessingQueueService implements OnModuleInit {
  private readonly logger = new Logger(DocumentProcessingQueueService.name);
  private queue: Queue;
  private worker: Worker;
  private readonly queueName = 'document-processing';
  private readonly concurrency = 2; // Process 2 documents simultaneously

  constructor(
    private configService: ConfigService,
    private documentParserService: DocumentParserService,
    private embeddingService: EmbeddingService,
    private vectorDatabaseService: VectorDatabaseService,
  ) {}

  async onModuleInit() {
    await this.initializeQueue();
    await this.initializeWorker();
  }

  /**
   * Initialize the processing queue
   */
  private async initializeQueue() {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB') || 0,
    };

    this.queue = new Queue(this.queueName, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });

    this.logger.log(`Document processing queue initialized: ${this.queueName}`);
  }

  /**
   * Initialize the worker to process jobs
   */
  private async initializeWorker() {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB') || 0,
    };

    this.worker = new Worker(
      this.queueName,
      async (job: Job<DocumentProcessingJob>) => {
        return await this.processDocument(job);
      },
      {
        connection: redisConfig,
        concurrency: this.concurrency,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    // Handle worker events
    this.worker.on('completed', (job: Job, result: DocumentProcessingResult) => {
      this.logger.log(`Job ${job.id} completed successfully for document ${result.documentId}`);
    });

    this.worker.on('failed', (job: Job, error: Error) => {
      this.logger.error(`Job ${job.id} failed for document ${job.data.documentId}: ${error.message}`);
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error(`Worker error: ${error.message}`, error.stack);
    });

    this.logger.log(`Document processing worker initialized with concurrency: ${this.concurrency}`);
  }



  /**
   * Add a document processing job to the queue
   */
  async addDocumentProcessingJob(jobData: DocumentProcessingJob): Promise<string> {
    try {
      const job = await this.queue.add('process-document', jobData, {
        jobId: jobData.documentId,
        priority: 1,
        delay: 0,
      });

      this.logger.log(`Added document processing job: ${job.id} for ${jobData.filename}`);
      
      return job.id as string;
    } catch (error) {
      this.logger.error(`Failed to add document processing job: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get the status of a specific job
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return null;
      }

      const status: JobStatus = {
        jobId: job.id as string,
        status: await this.getJobStatusString(job),
        progress: job.progress,
        createdAt: new Date(job.timestamp),
        updatedAt: new Date(job.processedOn || job.timestamp),
      };

      if (job.returnvalue) {
        status.result = job.returnvalue;
      }

      if (job.failedReason) {
        status.error = job.failedReason;
      }

      return status;
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all jobs for a specific organization
   */
  async getOrganizationJobs(organizationId: string, limit: number = 50): Promise<JobStatus[]> {
    try {
      const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, limit);
      
      const organizationJobs = jobs.filter(job => 
        job.data.organizationId === organizationId
      );

      const jobStatuses: JobStatus[] = [];
      
      for (const job of organizationJobs) {
        const status = await this.getJobStatus(job.id as string);
        if (status) {
          jobStatuses.push(status);
        }
      }

      return jobStatuses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.logger.error(`Failed to get organization jobs: ${error.message}`);
      return [];
    }
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      if (job.isActive() || job.isCompleted() || job.isFailed()) {
        return false; // Cannot cancel active, completed, or failed jobs
      }

      await job.remove();
      this.logger.log(`Cancelled job: ${jobId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  /**
   * Process a document (worker function)
   */
  private async processDocument(job: Job<DocumentProcessingJob>): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    const { documentId, filename, fileBuffer, organizationId, userId } = job.data;

    try {
      this.logger.log(`Processing document: ${filename} (${documentId})`);

      // Update job progress
      await job.updateProgress(10);

      // Step 1: Parse the document
      const parseResult = await this.documentParserService.parseDocument(
        fileBuffer,
        filename,
        documentId,
      );

      if (!parseResult.success || !parseResult.document) {
        throw new Error(`Document parsing failed: ${parseResult.error}`);
      }

      await job.updateProgress(30);

      // Step 2: Generate embeddings
      const embeddings = await this.embeddingService.generateChunkEmbeddings(
        parseResult.document.chunks,
      );

      if (embeddings.length !== parseResult.document.chunks.length) {
        throw new Error(`Embedding generation mismatch: expected ${parseResult.document.chunks.length}, got ${embeddings.length}`);
      }

      await job.updateProgress(70);

      // Step 3: Store in vector database
      const vectorResult = await this.vectorDatabaseService.storeDocumentChunks(
        documentId,
        parseResult.document.chunks,
        embeddings,
      );

      if (!vectorResult.success) {
        throw new Error(`Vector storage failed: ${vectorResult.error}`);
      }

      await job.updateProgress(100);

      const processingTime = Date.now() - startTime;

      const result: DocumentProcessingResult = {
        success: true,
        documentId,
        parsedDocument: parseResult.document,
        vectorCount: vectorResult.storedCount,
        processingTime,
      };

      this.logger.log(
        `Successfully processed document ${documentId}: ${vectorResult.storedCount} vectors in ${processingTime}ms`,
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error(
        `Failed to process document ${documentId}: ${error.message}`,
        error.stack,
      );

      const result: DocumentProcessingResult = {
        success: false,
        documentId,
        error: error.message,
        processingTime,
      };

      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Convert job state to string status
   */
  private async getJobStatusString(job: Job): Promise<'pending' | 'processing' | 'completed' | 'failed'> {
    if (await job.isCompleted()) return 'completed';
    if (await job.isFailed()) return 'failed';
    if (await job.isActive()) return 'processing';
    return 'pending';
  }

  /**
   * Clean up resources
   */
  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }
}
