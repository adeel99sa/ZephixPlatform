import { Injectable } from '@nestjs/common';
import { ApiResponse, PaginatedResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseService {
  success<T>(data: T, meta?: any): ApiResponse<T> {
    return {
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
    };
  }

  paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    meta?: any
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  error(code: string, message: string, details?: any): ApiResponse<null> {
    return {
      data: null,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}


