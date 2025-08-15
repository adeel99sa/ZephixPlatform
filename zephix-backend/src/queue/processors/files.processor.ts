import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import type { FileProcessPayload } from '../types'

const logger = new Logger('FilesProcessor')

export async function fileProcessor(job: Job<FileProcessPayload>) {
  const startTime = Date.now()
  const jobId = job.id
  const fileId = job.data.fileId
  
  try {
    logger.log(`Starting file processing job=${jobId} fileId=${fileId} bucket=${job.data.bucket}`)
    
    // TODO call your file service here
    await job.updateProgress(50)
    
    const duration = Date.now() - startTime
    logger.log(`File processing completed job=${jobId} fileId=${fileId} duration=${duration}ms`)
    
    return { stored: true, duration: `${duration}ms` }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`File processing failed job=${jobId} fileId=${fileId} error=${error.message} duration=${duration}ms`)
    throw error
  }
}

