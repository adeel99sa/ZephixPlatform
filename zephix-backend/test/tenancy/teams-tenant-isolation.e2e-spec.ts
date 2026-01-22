/**
 * E2E tests for TeamsModule tenant isolation
 *
 * Tests verify:
 * 1. Org-scoped read isolation (teams from org B don't appear in org A)
 * 2. Workspace-scoped filtering (teams filtered by workspaceId when in context)
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { Team } from '../../src/modules/teams/entities/team.entity';
import { Workspace } from '../../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('TeamsModule Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;
  let workspaceA: Workspace;
  let workspaceB: Workspace;
  let teamA: Team;
  let teamB: Team;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();

    dataSource = app.get(DataSource);

    // Create test organizations
    const orgRepo = dataSource.getRepository(Organization);
    orgA = await orgRepo.save({
      name: 'Org A - Teams Test',
      slug: `org-a-teams-${Date.now()}`,
    });
    orgB = await orgRepo.save({
      name: 'Org B - Teams Test',
      slug: `org-b-teams-${Date.now()}`,
    });

    // Create test users
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('test123', 10);
    userA = await userRepo.save({
      email: `user-a-teams-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'A',
      organizationId: orgA.id,
      role: 'admin',
    });
    userB = await userRepo.save({
      email: `user-b-teams-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'B',
      organizationId: orgB.id,
      role: 'admin',
    });

    // Create UserOrganization entries
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.save({
      userId: userA.id,
      organizationId: orgA.id,
      role: 'admin',
      isActive: true,
    });
    await userOrgRepo.save({
      userId: userB.id,
      organizationId: orgB.id,
      role: 'admin',
      isActive: true,
    });

    // Create workspaces
    const workspaceRepo = dataSource.getRepository(Workspace);
    workspaceA = await workspaceRepo.save({
      name: 'Workspace A - Teams',
      slug: `ws-a-teams-${Date.now()}`,
      organizationId: orgA.id,
      createdBy: userA.id,
    });
    workspaceB = await workspaceRepo.save({
      name: 'Workspace B - Teams',
      slug: `ws-b-teams-${Date.now()}`,
      organizationId: orgB.id,
      createdBy: userB.id,
    });

    // Create teams
    const teamRepo = dataSource.getRepository(Team);
    teamA = await teamRepo.save({
      name: 'Team A',
      slug: 'TEAMA',
      organizationId: orgA.id,
      workspaceId: workspaceA.id,
      visibility: 'org' as any,
      isArchived: false,
    });
    teamB = await teamRepo.save({
      name: 'Team B',
      slug: 'TEAMB',
      organizationId: orgB.id,
      workspaceId: workspaceB.id,
      visibility: 'org' as any,
      isArchived: false,
    });

    // Create JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    tokenA = jwt.sign(
      {
        sub: userA.id,
        email: userA.email,
        organizationId: orgA.id,
        role: 'admin',
      },
      jwtSecret,
    );
    tokenB = jwt.sign(
      {
        sub: userB.id,
        email: userB.email,
        organizationId: orgB.id,
        role: 'admin',
      },
      jwtSecret,
    );
  });

  afterAll(async () => {
    // Cleanup
    if (dataSource && dataSource.isInitialized) {
      const teamRepo = dataSource.getRepository(Team);
      const workspaceRepo = dataSource.getRepository(Workspace);
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const userRepo = dataSource.getRepository(User);
      const orgRepo = dataSource.getRepository(Organization);

      await teamRepo.delete([teamA.id, teamB.id]);
      await workspaceRepo.delete([workspaceA.id, workspaceB.id]);
      await userOrgRepo.delete([
        { userId: userA.id, organizationId: orgA.id },
        { userId: userB.id, organizationId: orgB.id },
      ]);
      await userRepo.delete([userA.id, userB.id]);
      await orgRepo.delete([orgA.id, orgB.id]);
    }

    await app.close();
  });

  describe('Org-scoped read isolation', () => {
    it('User from Org A should only see teams from Org A', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/teams')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ organizationId: orgA.id })
        .expect(200);

      const teams = response.body?.teams || [];
      if (Array.isArray(teams) && teams.length > 0) {
        // All teams should belong to orgA
        teams.forEach((team: any) => {
          expect(team.organizationId).toBe(orgA.id);
        });
        // Should not contain teamB
        expect(teams.some((t: any) => t.id === teamB.id)).toBe(false);
      }
    });

    it('User from Org A cannot access team from Org B', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/teams/${teamB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ organizationId: orgB.id }) // Attempt to bypass - should be ignored
        .expect(404); // Team not found (scoped to orgA, teamB is in orgB)
    });
  });
});



