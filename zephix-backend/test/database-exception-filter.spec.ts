import { DatabaseExceptionFilter } from '../src/common/filters/database-exception.filter';
import { QueryFailedError } from 'typeorm';
import { HttpStatus } from '@nestjs/common';

function makeError(code: string, constraint?: string) {
  const err: any = new Error('test');
  err.code = code;
  err.constraint = constraint;
  return new QueryFailedError('TEST', [], err);
}

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;

  beforeEach(() => {
    filter = new DatabaseExceptionFilter();
  });

  it('should return 409 for unique constraint violation', () => {
    const qfe = makeError('23505', 'uq_projects_name_ws');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/projects' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'CONFLICT',
      message: 'A project with this name already exists in this workspace',
      constraint: 'uq_projects_name_ws',
      path: '/api/projects',
      timestamp: expect.any(String),
    });
  });

  it('should return 409 for workspace unique constraint', () => {
    const qfe = makeError('23505', 'uq_ws_name_org');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/workspaces' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'CONFLICT',
      message: 'A workspace with this name already exists in this organization',
      constraint: 'uq_ws_name_org',
      path: '/api/workspaces',
      timestamp: expect.any(String),
    });
  });

  it('should return 409 for task unique constraint', () => {
    const qfe = makeError('23505', 'uq_tasks_number_project');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/tasks' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'CONFLICT',
      message: 'A task with this number already exists in this project',
      constraint: 'uq_tasks_number_project',
      path: '/api/tasks',
      timestamp: expect.any(String),
    });
  });

  it('should return 409 for resource allocation unique constraint', () => {
    const qfe = makeError('23505', 'uq_ra_unique');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/resources' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'CONFLICT',
      message: 'This resource allocation already exists for this week',
      constraint: 'uq_ra_unique',
      path: '/api/resources',
      timestamp: expect.any(String),
    });
  });

  it('should return 422 for check constraint violation (percentage)', () => {
    const qfe = makeError('23514', 'chk_ra_pct');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/resources' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      error: 'UNPROCESSABLE_ENTITY',
      message: 'Allocation percentage must be between 0 and 150',
      constraint: 'chk_ra_pct',
      path: '/api/resources',
      timestamp: expect.any(String),
    });
  });

  it('should return 422 for check constraint violation (hours)', () => {
    const qfe = makeError('23514', 'chk_ra_hours');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/resources' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      error: 'UNPROCESSABLE_ENTITY',
      message: 'Hours per week must be between 0 and 168',
      constraint: 'chk_ra_hours',
      path: '/api/resources',
      timestamp: expect.any(String),
    });
  });

  it('should return 400 for foreign key constraint violation', () => {
    const qfe = makeError('23503', 'tasks_project_id_fkey');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/tasks' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'BAD_REQUEST',
      message: 'The referenced record does not exist or has been deleted',
      constraint: 'tasks_project_id_fkey',
      path: '/api/tasks',
      timestamp: expect.any(String),
    });
  });

  it('should return 500 for unknown database error', () => {
    const qfe = makeError('99999', 'unknown_constraint');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/test' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Database error',
      constraint: 'unknown_constraint',
      path: '/api/test',
      timestamp: expect.any(String),
    });
  });

  it('should handle missing constraint gracefully', () => {
    const qfe = makeError('23505');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host: any = { 
      switchToHttp: () => ({ 
        getResponse: () => res, 
        getRequest: () => ({ url: '/api/test' }) 
      }) 
    };
    
    filter.catch(qfe as any, host as any);
    
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'CONFLICT',
      message: 'A record with this value already exists',
      constraint: undefined,
      path: '/api/test',
      timestamp: expect.any(String),
    });
  });
});