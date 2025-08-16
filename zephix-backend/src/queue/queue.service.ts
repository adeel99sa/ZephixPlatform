import { Injectable, Logger } from '@nestjs/common'
import { Queue, JobsOptions } from 'bullmq'
import { getRedis } from '../config/redis.config'
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

  private async getQueue(name: string): Promise<Queue> {
    if (this.queues.has(name)) return this.queues.get(name) as Queue
    const connection = await getRedis('client')
    const q = new Queue(name, { connection, defaultJobOptions: this.defaultJobOpts() })
    this.queues.set(name, q)
    return q
  }

  async enqueueRoleSeed(payload: RoleSeedPayload) {
    const q = await this.getQueue(QUEUE_NAMES.ROLES)
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
    const jobId = `email-${payload.to}-${Date.now()}`
    const job = await q.add('send', payload, { 
      jobId
      // Note: timeout not supported in this BullMQ version
    })
    // Secure logging - no email content
    this.logger.log(`Queued email job=${job.id} to=${payload.to} subject=${payload.subject}`)
    return job.id
  }

  // Cleanup method for graceful shutdown
  async closeAllQueues(): Promise<void> {
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
