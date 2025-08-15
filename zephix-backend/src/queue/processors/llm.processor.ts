import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import type { LlmCallPayload } from '../types'

const logger = new Logger('LlmProcessor')

export async function llmProcessor(job: Job<LlmCallPayload>) {
  const startTime = Date.now()
  const jobId = job.id
  const correlationId = job.data.correlationId
  
  try {
    logger.log(`Starting LLM call job=${jobId} correlationId=${correlationId} model=${job.data.model}`)
    
    // TODO call Anthropic here
    await job.updateProgress(10)
    
    const duration = Date.now() - startTime
    logger.log(`LLM call completed job=${jobId} correlationId=${correlationId} duration=${duration}ms`)
    
    return { responseId: `stub-${job.id}`, duration: `${duration}ms` }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`LLM call failed job=${jobId} correlationId=${correlationId} error=${error.message} duration=${duration}ms`)
    throw error
  }
}

