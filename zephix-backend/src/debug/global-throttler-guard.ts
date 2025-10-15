import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DebugThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector
  ) {
    super(options, storageService, reflector);
    console.log('🛡️ [GLOBAL GUARD LOADED]: DebugThrottlerGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('🛡️ [GLOBAL GUARD HIT]:', request.method, request.url, 'auth header:', !!request.headers?.authorization);
    
    // TEMP: allow through to see downstream guards
    return true;
  }
}
