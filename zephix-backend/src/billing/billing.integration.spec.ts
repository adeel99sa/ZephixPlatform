import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Subscription } from './entities/subscription.entity';
import { Plan, PlanType } from './entities/plan.entity';
import { Repository } from 'typeorm';

describe('Billing Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let orgRepo: Repository<Organization>;
  let userRepo: Repository<User>;
  let subscriptionRepo: Repository<Subscription>;
  let planRepo: Repository<Plan>;

  let testOrg: Organization;
  let adminUser: User;
  let memberUser: User;
  let adminToken: string;
  let memberToken: string;
  let starterPlan: Plan;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    orgRepo = moduleFixture.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    subscriptionRepo = moduleFixture.get<Repository<Subscription>>(
      getRepositoryToken(Subscription),
    );
    planRepo = moduleFixture.get<Repository<Plan>>(getRepositoryToken(Plan));

    // Find or create Starter plan
    starterPlan = await planRepo.findOne({
      where: { type: PlanType.STARTER, isActive: true },
    });

    if (!starterPlan) {
      starterPlan = planRepo.create({
        name: 'Starter',
        type: PlanType.STARTER,
        price: 0,
        isActive: true,
      });
      starterPlan = await planRepo.save(starterPlan);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testOrg) {
      await subscriptionRepo.delete({ organizationId: testOrg.id });
      await userRepo.delete({ organizationId: testOrg.id });
      await orgRepo.delete({ id: testOrg.id });
    }
    await app.close();
  });

  beforeEach(async () => {
    // Create test organization
    testOrg = orgRepo.create({
      name: 'Test Billing Org',
      slug: `test-billing-org-${Date.now()}`,
    });
    testOrg = await orgRepo.save(testOrg);

    // Create admin user
    adminUser = userRepo.create({
      email: `admin-${Date.now()}@test.com`,
      password: 'hashed-password',
      firstName: 'Admin',
      lastName: 'User',
      organizationId: testOrg.id,
      platformRole: 'admin',
    });
    adminUser = await userRepo.save(adminUser);

    // Create member user
    memberUser = userRepo.create({
      email: `member-${Date.now()}@test.com`,
      password: 'hashed-password',
      firstName: 'Member',
      lastName: 'User',
      organizationId: testOrg.id,
      platformRole: 'member',
    });
    memberUser = await userRepo.save(memberUser);

    // Get auth tokens (simplified - in real test you'd call login endpoint)
    // For now, we'll use a mock token approach
    adminToken = 'mock-admin-token';
    memberToken = 'mock-member-token';
  });

  afterEach(async () => {
    // Cleanup subscriptions for this org
    await subscriptionRepo.delete({ organizationId: testOrg.id });
  });

  describe('GET /api/billing/current-plan', () => {
    it('should auto-create default subscription for new org without subscription', async () => {
      // Verify no subscription exists
      const beforeCount = await subscriptionRepo.count({
        where: { organizationId: testOrg.id },
      });
      expect(beforeCount).toBe(0);

      // Call current-plan endpoint
      const response = await request(app.getHttpServer())
        .get('/api/billing/current-plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe(PlanType.STARTER);

      // Verify subscription was created
      const afterCount = await subscriptionRepo.count({
        where: { organizationId: testOrg.id },
      });
      expect(afterCount).toBe(1);

      const subscription = await subscriptionRepo.findOne({
        where: { organizationId: testOrg.id },
        relations: ['plan'],
      });

      expect(subscription).toBeDefined();
      expect(subscription.status).toBe('active');
      expect(subscription.planId).toBe(starterPlan.id);
      expect(subscription.plan.type).toBe(PlanType.STARTER);
    });
  });

  describe('POST /api/billing/subscribe', () => {
    it('should create subscription when org has no subscription', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ planId: starterPlan.id })
        .expect(200);

      expect(response.body.data).toHaveProperty('subscription');
      expect(response.body.data).toHaveProperty('plan');
      expect(response.body.data).toHaveProperty('billingMode');
      expect(response.body.data.subscription.status).toBe('active');
      expect(response.body.data.subscription.planId).toBe(starterPlan.id);
    });

    it('should return 403 when called by member (non-admin)', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ planId: starterPlan.id })
        .expect(403);
    });
  });

  describe('PATCH /api/billing/subscription', () => {
    beforeEach(async () => {
      // Create initial subscription
      const subscription = subscriptionRepo.create({
        organizationId: testOrg.id,
        planId: starterPlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        cancelAtPeriodEnd: false,
      });
      await subscriptionRepo.save(subscription);
    });

    it('should update subscription plan when ALLOW_PLAN_CHANGES=true', async () => {
      // This test assumes ALLOW_PLAN_CHANGES is set in test env
      // In real test, you'd set env var or mock ConfigService
      const professionalPlan = await planRepo.findOne({
        where: { type: PlanType.PROFESSIONAL, isActive: true },
      });

      if (professionalPlan) {
        const response = await request(app.getHttpServer())
          .patch('/api/billing/subscription')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-organization-id', testOrg.id)
          .send({ planId: professionalPlan.id })
          .expect(200);

        expect(response.body.data.planId).toBe(professionalPlan.id);
      }
    });

    it('should return 403 when called by member (non-admin)', async () => {
      await request(app.getHttpServer())
        .patch('/api/billing/subscription')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ planId: starterPlan.id })
        .expect(403);
    });
  });

  describe('POST /api/billing/cancel', () => {
    beforeEach(async () => {
      // Create active subscription
      const subscription = subscriptionRepo.create({
        organizationId: testOrg.id,
        planId: starterPlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        cancelAtPeriodEnd: false,
      });
      await subscriptionRepo.save(subscription);
    });

    it('should set cancelAtPeriodEnd=true by default', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id)
        .send({})
        .expect(200);

      expect(response.body.data.cancelAtPeriodEnd).toBe(true);
      expect(response.body.data.status).toBe('active'); // Still active until period end
    });

    it('should cancel immediately when cancelNow=true', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id)
        .send({ cancelNow: true })
        .expect(200);

      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancelAtPeriodEnd).toBe(false);
      expect(response.body.data.canceledAt).toBeDefined();
    });

    it('should return 403 when called by member (non-admin)', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/cancel')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-organization-id', testOrg.id)
        .send({})
        .expect(403);
    });
  });
});
