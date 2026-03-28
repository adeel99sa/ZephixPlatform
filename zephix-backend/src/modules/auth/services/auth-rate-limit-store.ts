import { Injectable } from '@nestjs/common';

export interface AuthRateLimitStore {
  hit(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; remaining: number }>;
}

@Injectable()
export class NoopAuthRateLimitStore implements AuthRateLimitStore {
  async hit(): Promise<{ allowed: boolean; remaining: number }> {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER };
  }
}
