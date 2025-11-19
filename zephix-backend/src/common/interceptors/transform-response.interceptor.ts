import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If response already has our structure, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If response has a 'data' property, extract it
        const responseData = data?.data !== undefined ? data.data : data;

        // Build standardized response
        return {
          success: true,
          data: responseData,
          total:
            data?.total ||
            (Array.isArray(responseData) ? responseData.length : undefined),
          page: data?.page || 1,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
