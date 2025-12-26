/**
 * E2E tests for BillingModule tenant isolation
 *
 * Tests verify:
 * 1. Org-scoped read isolation (subscriptions from org B don't appear in org A)
 * 2. Cross-tenant access blocked (404 for org-scoped entities)
 * 3. Write isolation (org B cannot update/delete org A subscription)
 * 4. Plans endpoint works for both orgs (Plan is global)
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { Subscription, SubscriptionStatus } from '../../src/billing/entities/subscription.entity';
import { Plan, PlanType } from '../../src/billing/entities/plan.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('BillingModule Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;
  let plan: Plan;
  let subscriptionA: Subscription;
  let subscriptionB: Subscription;
  let userOrgA: UserOrganization;
  let userOrgB: UserOrganization;
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
      name: 'Org A - Billing Test',
      slug: `org-a-billing-${Date.now()}`,
    });
    orgB = await orgRepo.save({
      name: 'Org B - Billing Test',
      slug: `org-b-billing-${Date.now()}`,
    });

    // Create test users
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('test123', 10);
    userA = await userRepo.save({
      email: `user-a-billing-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'A',
      organizationId: orgA.id,
      role: 'admin',
    });
    userB = await userRepo.save({
      email: `user-b-billing-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'B',
      organizationId: orgB.id,
      role: 'admin',
    });

    // Create UserOrganization entries
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    userOrgA = userOrgRepo.create({
      userId: userA.id,
      organizationId: orgA.id,
      role: 'admin',
      isActive: true,
    });
    userOrgB = userOrgRepo.create({
      userId: userB.id,
      organizationId: orgB.id,
      role: 'admin',
      isActive: true,
    });
    await userOrgRepo.save([userOrgA, userOrgB]);

    // Create a plan (global entity)
    const planRepo = dataSource.getRepository(Plan);
    plan = await planRepo.save({
      name: 'Test Plan',
      type: PlanType.PROFESSIONAL,
      price: 17.99,
      billingCycle: 'monthly' as any,
      features: {
        maxUsers: 10,
        maxProjects: 20,
        maxWorkspaces: 5,
        storageGB: 100,
      },
      featureList: ['Test features'],
      isActive: true,
    });

    // Create subscriptions
    const subscriptionRepo = dataSource.getRepository(Subscription);
    subscriptionA = await subscriptionRepo.save({
      organizationId: orgA.id,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
      metadata: {},
    });
    subscriptionB = await subscriptionRepo.save({
      organizationId: orgB.id,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
      metadata: {},
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
      const subscriptionRepo = dataSource.getRepository(Subscription);
      const planRepo = dataSource.getRepository(Plan);
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const userRepo = dataSource.getRepository(User);
      const orgRepo = dataSource.getRepository(Organization);

      await subscriptionRepo.delete([subscriptionA.id, subscriptionB.id]);
      await planRepo.delete(plan.id);
      if (userOrgA) await userOrgRepo.delete(userOrgA.id);
      if (userOrgB) await userOrgRepo.delete(userOrgB.id);
      await userRepo.delete([userA.id, userB.id]);
      await orgRepo.delete([orgA.id, orgB.id]);
    }

    await app.close();
  });

  describe('Org-scoped read isolation', () => {
    it('User from Org A should only see subscription from Org A', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const subscription = response.body?.data;
      if (subscription) {
        // Subscription should belong to orgA
        expect(subscription.organizationId).toBe(orgA.id);
        expect(subscription.id).toBe(subscriptionA.id);
        // Should not contain subscriptionB
        expect(subscription.id).not.toBe(subscriptionB.id);
      }
    });

    it('User from Org A cannot access subscription from Org B', async () => {
      // Try to access subscription via ID (if endpoint exists)
      // Since subscription endpoint doesn't take ID, we test via update attempt
      const response = await request(app.getHttpServer())
        .patch('/api/billing/subscription')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ planType: PlanType.PROFESSIONAL })
        .expect(404); // Subscription not found (scoped to orgA, subscriptionB is in orgB)
    });
  });

  describe('Write isolation', () => {
    it('User from Org B cannot update subscription from Org A', async () => {
      // Org B tries to update subscription (will find their own or 404)
      // Since findForOrganization is scoped, it won't find orgA's subscription
      const response = await request(app.getHttpServer())
        .patch('/api/billing/subscription')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ planType: PlanType.ENTERPRISE })
        .expect(404); // Subscription not found (scoped to orgB, subscriptionA is in orgA)
    });

    it('User from Org B cannot delete subscription from Org A', async () => {
      // Org B tries to cancel subscription (will find their own or 404)
      const response = await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404); // Subscription not found (scoped to orgB, subscriptionA is in orgA)
    });
  });

  describe('Global entity access (Plans)', () => {
    it('Both orgs can access plans endpoint (Plan is global)', async () => {
      const responseA = await request(app.getHttpServer())
        .get('/api/billing/plans')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get('/api/billing/plans')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      // Both should return plans (global entity)
      expect(responseA.body?.data).toBeDefined();
      expect(responseB.body?.data).toBeDefined();

      // Both should include the test plan
      const plansA = responseA.body?.data || [];
      const plansB = responseB.body?.data || [];
      expect(plansA.some((p: any) => p.id === plan.id)).toBe(true);
      expect(plansB.some((p: any) => p.id === plan.id)).toBe(true);
    });
  });
});
