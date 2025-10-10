import { Controller, Get } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

type PgCode = '23505' | '23514' | '23503';

@Controller('test')
export class TestController {
  private makePgError(code: PgCode, constraint: string, detail: string): QueryFailedError {
    const driverError: any = new Error(detail);
    driverError.code = code;
    driverError.constraint = constraint;
    driverError.detail = detail;
    return new QueryFailedError('TEST QUERY', [], driverError);
  }

  @Get('unique-violation')
  uniqueViolation() {
    // 23505 unique violation → expect 409
    throw this.makePgError(
      '23505',
      'uq_projects_name_ws',
      'Key (name, workspace_id)=(Test, 123) already exists.'
    );
  }

  @Get('check-violation')
  checkViolation() {
    // 23514 check violation → expect 422
    throw this.makePgError(
      '23514',
      'chk_ra_pct',
      'Failing row contains allocation_percentage = 200'
    );
  }

  @Get('fk-violation')
  fkViolation() {
    // 23503 foreign key violation → expect 400
    throw this.makePgError(
      '23503',
      'tasks_project_id_fkey',
      'Key (project_id)=(00000000...) is not present in table "projects".'
    );
  }
}