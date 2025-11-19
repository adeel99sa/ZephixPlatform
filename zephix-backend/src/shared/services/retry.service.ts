import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  backoffStrategy: 'exponential' | 'linear' | 'constant';
  retryCondition?: (error: Error) => boolean;
  baseDelay?: number;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    let lastError: Error;
    const baseDelay = options.baseDelay || 1000;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === options.maxAttempts) {
          this.logger.error(
            `Operation failed after ${options.maxAttempts} attempts`,
            {
              error: error.message,
              attempts: attempt,
            },
          );
          throw error;
        }

        if (options.retryCondition && !options.retryCondition(lastError)) {
          this.logger.warn(`Operation failed and is not retryable`, {
            error: error.message,
            attempt,
          });
          throw error;
        }

        const delay = this.calculateDelay(
          attempt,
          baseDelay,
          options.backoffStrategy,
        );
        this.logger.warn(`Operation failed, retrying in ${delay}ms`, {
          error: error.message,
          attempt,
          nextRetryIn: delay,
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(
    attempt: number,
    baseDelay: number,
    strategy: 'exponential' | 'linear' | 'constant',
  ): number {
    switch (strategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      case 'linear':
        return baseDelay * attempt;
      case 'constant':
        return baseDelay;
      default:
        return baseDelay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
