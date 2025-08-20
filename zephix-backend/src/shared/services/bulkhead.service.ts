import { Injectable, Logger } from '@nestjs/common';

// ✅ PROPER TYPING - NO MORE 'any' TYPES
export interface BulkheadOptions {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout: number;
}

export interface Bulkhead {
  execute<T>(operation: () => Promise<T>): Promise<T>;
}

export interface QueuedOperation<T> {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

@Injectable()
export class BulkheadService {
  private readonly logger = new Logger(BulkheadService.name);

  createBulkhead(options: BulkheadOptions): Bulkhead {
    return new BulkheadImpl(options);
  }
}

class BulkheadImpl implements Bulkhead {
  private currentExecutions = 0;
  private queue: QueuedOperation<unknown>[] = [];

  constructor(private readonly options: BulkheadOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.currentExecutions < this.options.maxConcurrent) {
      return this.executeOperation(operation);
    }

    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error('Bulkhead queue is full');
    }

    return new Promise<T>((resolve, reject) => {
      const queuedOperation: QueuedOperation<T> = {
        operation,
        resolve,
        reject,
      };
      this.queue.push(queuedOperation as QueuedOperation<unknown>);
    });
  }

  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    this.currentExecutions++;

    try {
      const result = await Promise.race([operation(), this.createTimeout()]);

      return result;
    } finally {
      this.currentExecutions--;
      this.processQueue();
    }
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Bulkhead operation timeout'));
      }, this.options.timeout);
    });
  }

  private processQueue(): void {
    if (
      this.queue.length === 0 ||
      this.currentExecutions >= this.options.maxConcurrent
    ) {
      return;
    }

    const queuedOperation = this.queue.shift();
    if (queuedOperation) {
      const { operation, resolve, reject } = queuedOperation;
      this.executeOperation(operation).then(resolve).catch(reject);
    }
  }
}
