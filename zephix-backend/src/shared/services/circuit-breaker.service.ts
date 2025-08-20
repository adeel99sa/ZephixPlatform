import { Injectable, Logger } from '@nestjs/common';

// ✅ PROPER TYPING - NO MORE 'any' TYPES
export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedException?: Error | string;
}

export interface CircuitBreaker {
  isOpen(): boolean;
  isClosed(): boolean;
  isHalfOpen(): boolean;
  recordSuccess(): void;
  recordFailure(error?: Error): void;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
    const circuitBreaker = new CircuitBreakerImpl(options);
    return circuitBreaker;
  }

  isOpen(circuitBreaker: CircuitBreaker): boolean {
    return circuitBreaker.isOpen();
  }

  isClosed(circuitBreaker: CircuitBreaker): boolean {
    return circuitBreaker.isClosed();
  }

  isHalfOpen(circuitBreaker: CircuitBreaker): boolean {
    return circuitBreaker.isHalfOpen();
  }
}

class CircuitBreakerImpl implements CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly expectedException?: Error | string;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold;
    this.recoveryTimeout = options.recoveryTimeout;
    this.expectedException = options.expectedException;
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  isClosed(): boolean {
    return this.state === 'CLOSED';
  }

  isHalfOpen(): boolean {
    return this.state === 'HALF_OPEN';
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure(_error?: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF_OPEN';
      }, this.recoveryTimeout);
    }
  }
}
