/**
 * DB-backed smoke for guard-audit wiring (requires migrated schema including 18000000000077).
 * Skipped when DATABASE_URL is unset (same gate as matrix example E2E).
 */
import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, DiscoveryModule, MetadataScanner } from '@nestjs/core';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { databaseConfig } from '../../../src/config/database.config';
import { AuditModule } from '../../../src/modules/audit/audit.module';
import { AuditGuardDecision } from '../../../src/common/audit/audit-guard-decision.decorator';
import { GuardAuditRouteRegistry } from '../../../src/common/audit/guard-audit-route-registry.service';
import { GuardAuditInterceptor } from '../../../src/common/audit/guard-audit.interceptor';
import { GuardAuditAuthzExceptionFilter } from '../../../src/common/audit/guard-audit-authz-exception.filter';
import type { AuthRequest } from '../../../src/common/http/auth-request';

const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** Nest converts `canActivate === false` to ForbiddenException (RouterExecutionContext). */
@Injectable()
class GuardThatReturnsFalse implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

@Controller('permission-matrix/guard-audit-probe')
class GuardAuditProbeController {
  @Get('allow')
  @AuditGuardDecision({
    action: 'config',
    scope: 'workspace',
    requiredRole: 'workspace_owner',
  })
  allow() {
    return { ok: true };
  }

  @Get('deny')
  @AuditGuardDecision({
    action: 'destructive',
    scope: 'workspace',
    requiredRole: 'workspace_owner',
  })
  deny() {
    throw new ForbiddenException('probe-deny');
  }

  @Get('guard-false')
  @UseGuards(GuardThatReturnsFalse)
  @AuditGuardDecision({
    action: 'config',
    scope: 'workspace',
    requiredRole: 'workspace_owner',
  })
  guardFalse() {
    return { unexpected: true };
  }
}

const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOrSkip('guard-audit integration (DATABASE_URL)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(databaseConfig),
        AuditModule,
        DiscoveryModule,
      ],
      controllers: [GuardAuditProbeController],
      providers: [
        MetadataScanner,
        GuardAuditRouteRegistry,
        GuardThatReturnsFalse,
        { provide: APP_INTERCEPTOR, useClass: GuardAuditInterceptor },
        { provide: APP_FILTER, useClass: GuardAuditAuthzExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: AuthRequest, _res, next) => {
      req.user = {
        id: USER,
        email: 'probe@test.dev',
        organizationId: ORG,
        platformRole: 'ADMIN',
      };
      next();
    });
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    try {
      await dataSource?.query(`DELETE FROM audit_events WHERE organization_id = $1`, [
        ORG,
      ]);
    } catch {
      /* ignore */
    }
    try {
      await app?.close();
    } catch {
      /* ignore */
    }
  });

  it('writes guard_allow for decorated 2xx route', async () => {
    await request(app.getHttpServer())
      .get('/api/permission-matrix/guard-audit-probe/allow')
      .expect(200);

    const rows = await dataSource.query(
      `SELECT action, entity_type FROM audit_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 3`,
      [ORG],
    );
    expect(rows.some((r: { action: string }) => r.action === 'guard_allow')).toBe(
      true,
    );
    expect(
      rows.some(
        (r: { entity_type: string }) => r.entity_type === 'authorization_decision',
      ),
    ).toBe(true);
  });

  it('writes guard_deny for decorated Forbidden route', async () => {
    await request(app.getHttpServer())
      .get('/api/permission-matrix/guard-audit-probe/deny')
      .expect(403);

    const rows = await dataSource.query(
      `SELECT action FROM audit_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [ORG],
    );
    expect(rows.some((r: { action: string }) => r.action === 'guard_deny')).toBe(true);
  });

  it('writes guard_deny when guard returns false (Nest ForbiddenException)', async () => {
    await request(app.getHttpServer())
      .get('/api/permission-matrix/guard-audit-probe/guard-false')
      .expect(403);

    const rows = await dataSource.query(
      `SELECT action, metadata_json FROM audit_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [ORG],
    );
    const denyRows = rows.filter((r: { action: string }) => r.action === 'guard_deny');
    expect(denyRows.length).toBeGreaterThan(0);
    const sample = denyRows[0] as { metadata_json?: { denyReason?: string } };
    expect(sample.metadata_json).toBeTruthy();
  });
});
