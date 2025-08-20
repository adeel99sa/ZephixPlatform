import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  add<T>(
    queueName: string,
    payload: T,
    _options?: {
      delay?: number;
      attempts?: number;
      backoff?: 'exponential' | 'fixed';
    },
  ): void {
    this.logger.debug(`Queue add: ${queueName} ->`, payload as any);
    // Placeholder: integrate BullMQ/Cloud task queue here
    return;
  }

  remove(queueName: string, id: string): void {
    this.logger.debug(`Queue remove: ${queueName} id=${id}`);
    // Placeholder
    return;
  }
}
