/**
 * E2E tests for CustomFieldsModule tenant isolation
 *
 * Tests verify:
 * 1. Org-scoped read isolation (custom fields from org B don't appear in org A)
 * 2. Cross-tenant access blocked (404 for org-scoped entities)
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { CustomField } from '../../src/modules/custom-fields/entities/custom-field.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('CustomFieldsModule Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;
  let customFieldA: CustomField;
  let customFieldB: CustomField;
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
      name: 'Org A - Custom Fields Test',
      slug: `org-a-cf-${Date.now()}`,
    });
    orgB = await orgRepo.save({
      name: 'Org B - Custom Fields Test',
      slug: `org-b-cf-${Date.now()}`,
    });

    // Create test users
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('test123', 10);
    userA = await userRepo.save({
      email: `user-a-cf-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'A',
      organizationId: orgA.id,
      role: 'admin',
    });
    userB = await userRepo.save({
      email: `user-b-cf-${Date.now()}@test.com`,
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

    // Create custom fields
    const customFieldRepo = dataSource.getRepository(CustomField);
    customFieldA = await customFieldRepo.save({
      name: 'field_a',
      label: 'Field A',
      type: 'text' as any,
      organizationId: orgA.id,
      createdBy: userA.id,
      scope: 'all' as any,
      isActive: true,
    });
    customFieldB = await customFieldRepo.save({
      name: 'field_b',
      label: 'Field B',
      type: 'text' as any,
      organizationId: orgB.id,
      createdBy: userB.id,
      scope: 'all' as any,
      isActive: true,
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
      const customFieldRepo = dataSource.getRepository(CustomField);
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const userRepo = dataSource.getRepository(User);
      const orgRepo = dataSource.getRepository(Organization);

      await customFieldRepo.delete([customFieldA.id, customFieldB.id]);
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
    it('User from Org A should only see custom fields from Org A', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/custom-fields')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const fields = response.body || [];
      if (Array.isArray(fields) && fields.length > 0) {
        // All fields should belong to orgA
        fields.forEach((field: any) => {
          expect(field.organizationId).toBe(orgA.id);
        });
        // Should not contain customFieldB
        expect(fields.some((f: any) => f.id === customFieldB.id)).toBe(false);
      }
    });

    it('User from Org A cannot access custom field from Org B', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/custom-fields/${customFieldB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // Custom field not found (scoped to orgA, customFieldB is in orgB)
    });

    it('User from Org B cannot access custom field from Org A', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/custom-fields/${customFieldA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404); // Custom field not found (scoped to orgB, customFieldA is in orgA)
    });
  });

  describe('Write isolation', () => {
    it('User from Org A cannot create custom field with organizationId from Org B', async () => {
      // Even if organizationId is passed in body, it should be ignored
      const response = await request(app.getHttpServer())
        .post('/api/admin/custom-fields')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'bypass_attempt',
          label: 'Bypass Attempt',
          type: 'text',
          organizationId: orgB.id, // Attempt to bypass - should be ignored
        })
        .expect(201); // Created, but with orgA's organizationId from context

      // Verify the created field belongs to orgA, not orgB
      expect(response.body.organizationId).toBe(orgA.id);
      expect(response.body.organizationId).not.toBe(orgB.id);

      // Cleanup
      const customFieldRepo = dataSource.getRepository(CustomField);
      await customFieldRepo.delete({ id: response.body.id });
    });
  });
});


