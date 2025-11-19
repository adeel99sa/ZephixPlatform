import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already wrapped, don't double-wrap
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }

        // Wrap the response in the standard envelope format
        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: context.switchToHttp().getRequest().id || 'unknown',
          },
        };
      }),
    );
  }
}
