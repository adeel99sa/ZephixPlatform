import { Injectable, Logger } from '@nestjs/common';

export interface BulkheadOptions {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout: number;
}

export interface Bulkhead {
  execute<T>(operation: () => Promise<T>): Promise<T>;
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
  private queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(private readonly options: BulkheadOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.currentExecutions < this.options.maxConcurrent) {
      return this.executeOperation(operation);
    }

    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error('Bulkhead queue is full');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
    });
  }

  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    this.currentExecutions++;
    
    try {
      const result = await Promise.race([
        operation(),
        this.createTimeout(),
      ]);
      
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
    if (this.queue.length === 0 || this.currentExecutions >= this.options.maxConcurrent) {
      return;
    }

    const { operation, resolve, reject } = this.queue.shift()!;
    this.executeOperation(operation).then(resolve).catch(reject);
  }
}
