import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

type PgCode = '23505'|'23514'|'23503';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: PgCode; constraint?: string }, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const code = exception.code as PgCode | undefined;
    const constraint = (exception as any)?.constraint ?? '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    if (code === '23505') {
      status = HttpStatus.CONFLICT;
      message = 'A record with this value already exists';
      if (constraint.includes('uq_projects_name_ws')) {
        message = 'A project with this name already exists in this workspace';
      } else if (constraint.includes('uq_ws_name_org')) {
        message = 'A workspace with this name already exists in this organization';
      } else if (constraint.includes('uq_tasks_number_project')) {
        message = 'A task with this number already exists in this project';
      } else if (constraint.includes('uq_ra_unique')) {
        message = 'This resource allocation already exists for this week';
      }
    } else if (code === '23514') {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = 'Invalid value provided';
      if (constraint.includes('chk_ra_pct')) {
        message = 'Allocation percentage must be between 0 and 150';
      } else if (constraint.includes('chk_ra_hours')) {
        message = 'Hours per week must be between 0 and 168';
      }
    } else if (code === '23503') {
      status = HttpStatus.BAD_REQUEST;
      message = 'The referenced record does not exist or has been deleted';
    }

    return res.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      constraint: constraint || undefined,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}