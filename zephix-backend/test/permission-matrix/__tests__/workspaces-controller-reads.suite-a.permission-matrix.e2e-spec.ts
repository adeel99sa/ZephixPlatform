/**
 * AD-027 batch 1a-i — Suite A only (one AppModule bootstrap per file).
 * ZEPHIX_WS_MEMBERSHIP_V1=1 before bootstrap (canonical strict mode).
 *
 * Split from dual-suite file to avoid Jest + TypeORM teardown races between
 * sequential bootstraps in one worker (see PR #229 CI).
 */
import { INestApplication } from '@nestjs/common';
import type { PermissionMatrixFixtures } from '../index';
import {
  bootstrapWorkspaceReadsApp,
  closeWorkspaceReadsApp,
} from './workspaces-controller-reads.bootstrap';
import {
  registerOrgListTests,
  registerWorkspaceReadMatrixTests,
} from './workspaces-controller-reads.register-matrix';

const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOrSkip(
  'AD-027 1a-i — workspace reads (Suite A: ZEPHIX_WS_MEMBERSHIP_V1=1)',
  () => {
    jest.setTimeout(180000);

    let app: INestApplication;
    let fixtures: PermissionMatrixFixtures;
    let savedWsFlag: string | undefined;
    let savedResourceAi: string | undefined;

    beforeAll(async () => {
      savedWsFlag = process.env.ZEPHIX_WS_MEMBERSHIP_V1;
      savedResourceAi = process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';
      const boot = await bootstrapWorkspaceReadsApp();
      app = boot.app;
      fixtures = boot.fixtures;
    });

    afterAll(async () => {
      if (savedWsFlag === undefined) delete process.env.ZEPHIX_WS_MEMBERSHIP_V1;
      else process.env.ZEPHIX_WS_MEMBERSHIP_V1 = savedWsFlag;
      if (savedResourceAi === undefined) {
        delete process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
      } else {
        process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = savedResourceAi;
      }
      await closeWorkspaceReadsApp(app);
    });

    const getFixtures = () => fixtures;

    registerWorkspaceReadMatrixTests(app, getFixtures);
    registerOrgListTests(app, getFixtures);
  },
);
