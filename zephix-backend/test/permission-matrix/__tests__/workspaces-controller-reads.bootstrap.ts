import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import {
  buildPermissionMatrixFixtures,
  type PermissionMatrixFixtures,
} from '../index';

/**
 * Single AppModule bootstrap for workspace-reads permission matrix suites.
 * Caller must set `ZEPHIX_WS_MEMBERSHIP_V1` (or unset) before calling — ConfigModule reads env at startup.
 */
export async function bootstrapWorkspaceReadsApp(): Promise<{
  app: INestApplication;
  fixtures: PermissionMatrixFixtures;
}> {
  process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = 'true';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.init();

  const fixtures = await buildPermissionMatrixFixtures(app);
  return { app, fixtures };
}

/** Nest closes TypeORM; explicit DataSource.destroy() ensures connection pool releases even if keepConnectionAlive was set. */
export async function closeWorkspaceReadsApp(
  app: INestApplication | undefined,
): Promise<void> {
  if (!app) return;
  try {
    const ds = app.get(DataSource);
    await app.close();
    if (ds?.isInitialized) await ds.destroy();
  } catch {
    /* ignore */
  }
}
