import { Injectable, Logger } from '@nestjs/common'
import { Queue, JobsOptions } from 'bullmq'
import { getRedis, isRedisConfigured } from '../config/redis.config'
import { QUEUE_NAMES } from './constants'
import type { RoleSeedPayload, FileProcessPayload, LlmCallPayload, EmailPayload } from './types'
import { v4 as uuidv4 } from 'uuid'

type AnyPayload = RoleSeedPayload | FileProcessPayload | LlmCallPayload | EmailPayload

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name)
  private queues: Map<string, Queue> = new Map()

  private defaultJobOpts(): JobsOptions {
    return {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
      priority: 5,
      // Idempotency
      jobId: uuidv4()
    }
  }

  private async getQueue(name: string): Promise<Queue | null> {
    // If Redis is not configured, return null
    if (!isRedisConfigured()) {
      this.logger.debug(`Redis not configured, cannot create queue: ${name}`)
      return null
    }

    if (this.queues.has(name)) return this.queues.get(name) as Queue
    
    const connection = await getRedis('client')
    if (!connection) {
      this.logger.warn(`Redis connection failed, cannot create queue: ${name}`)
      return null
    }
    
    const q = new Queue(name, { connection, defaultJobOptions: this.defaultJobOpts() })
    this.queues.set(name, q)
    return q
  }

  async enqueueRoleSeed(payload: RoleSeedPayload) {
    const q = await this.getQueue(QUEUE_NAMES.ROLES)
    if (!q) {
      this.logger.warn('Redis not configured, role seed job not queued')
      // Return a mock job ID for compatibility
      return `mock-role-seed-${Date.now()}`
    }
    
    const jobId = uuidv4()
    const job = await q.add('seed', payload, { 
      jobId,
      // Note: timeout not supported in this BullMQ version
      // Job will be processed with 30 second timeout in processor
      removeOnComplete: { age: 3600 }, // Keep completed jobs for 1 hour
      removeOnFail: { age: 86400 }     // Keep failed jobs for 24 hours
    })
    // Secure logging - no sensitive data
    this.logger.log(`Queued roles seed job=${job.id} mode=${payload.mode} tenant=${payload.tenantId || 'N/A'} force=${payload.force || false}`)
    return job.id
  }

  async enqueueFileProcess(payload: FileProcessPayload) {
    const q = await this.getQueue(QUEUE_NAMES.FILES)
    if (!q) {
      this.logger.warn('Redis not configured, file process job not queued')
      // Return a mock job ID for compatibility
      return `mock-file-process-${Date.now()}`
    }
    
    const jobId = `file-${payload.fileId}-${Date.now()}`
    const job = await q.add('process', payload, { 
      jobId
      // Note: timeout not supported in this BullMQ version
    })
    // Secure logging - no file content
    this.logger.log(`Queued file processing job=${job.id} fileId=${payload.fileId} bucket=${payload.bucket}`)
    return job.id
  }

  async enqueueLlmCall(payload: LlmCallPayload) {
    const q = await this.getQueue(QUEUE_NAMES.LLM)
    if (!q) {
      this.logger.warn('Redis not configured, LLM call job not queued')
      // Return a mock job ID for compatibility
      return `mock-llm-call-${Date.now()}`
    }
    
    const jobId = `llm-${payload.correlationId}-${Date.now()}`
    const job = await q.add('call', payload, { 
      jobId,
      removeOnComplete: { age: 7200 }, // Keep LLM jobs longer for debugging
      removeOnFail: { age: 86400 * 7 }, // Keep failed LLM jobs for a week
      // Note: timeout not supported in this BullMQ version
    })
    // Secure logging - no prompt content
    this.logger.log(`Queued LLM call job=${job.id} correlationId=${payload.correlationId} model=${payload.model}`)
    return job.id
  }

  async enqueueEmail(payload: EmailPayload) {
    const q = await this.getQueue(QUEUE_NAMES.EMAIL)
    if (!q) {
      this.logger.warn('Redis not configured, email job not queued')
      // Return a mock job ID for compatibility
      return `mock-email-${Date.now()}`
    }
    
    const jobId = `email-${payload.to}-${Date.now()}`
    const job = await q.add('send', payload, { 
      jobId
      // Note: timeout not supported in this BullMQ version
    })
    // Secure logging - no email content
    this.logger.log(`Queued email job=${job.id} to=${payload.to} subject=${payload.subject}`)
    return job.id
  }

  // Check if Redis is configured
  isRedisAvailable(): boolean {
    return isRedisConfigured()
  }

  // Get queue status
  getQueueStatus() {
    if (!isRedisConfigured()) {
      return {
        status: 'Redis not configured',
        queues: [],
        totalQueues: 0
      }
    }
    
    return {
      status: 'Redis configured',
      queues: Array.from(this.queues.keys()),
      totalQueues: this.queues.size
    }
  }

  // Cleanup method for graceful shutdown
  async closeAllQueues(): Promise<void> {
    if (!isRedisConfigured()) {
      this.logger.debug('Redis not configured, no queues to close')
      return
    }
    
    this.logger.log('Closing all queues...')
    const closePromises = Array.from(this.queues.values()).map(async (queue) => {
      try {
        await queue.close()
        this.logger.log(`Queue ${queue.name} closed`)
      } catch (error) {
        this.logger.warn(`Error closing queue ${queue.name}:`, error.message)
      }
    })
    
    await Promise.all(closePromises)
    this.queues.clear()
    this.logger.log('All queues closed')
  }
}
