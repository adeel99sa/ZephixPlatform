import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Organization } from '../src/organizations/entities/organization.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Resource Seed Controller Guard (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let dataSource: DataSource;
  let orgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    await app.init();

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    const org = orgRepo.create({
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
    });
    const savedOrg = await orgRepo.save(org);
    orgId = savedOrg.id;

    // Create admin user
    const userRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminUser = userRepo.create({
      email: `admin-${Date.now()}@test.com`,
      firstName: 'Admin',
      lastName: 'User',
      password: passwordHash,
    });
    const savedAdmin = await userRepo.save(adminUser);
    adminUserId = savedAdmin.id;

    // Create member user
    const memberUser = userRepo.create({
      email: `member-${Date.now()}@test.com`,
      firstName: 'Member',
      lastName: 'User',
      password: passwordHash,
    });
    const savedMember = await userRepo.save(memberUser);
    memberUserId = savedMember.id;

    // Link users to organization
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const adminUserOrg = userOrgRepo.create({
      userId: adminUserId,
      organizationId: orgId,
      role: 'admin',
      isActive: true,
    });
    const memberUserOrg = userOrgRepo.create({
      userId: memberUserId,
      organizationId: orgId,
      role: 'pm', // 'pm' is the member role in UserOrganization
      isActive: true,
    });
    await userOrgRepo.save([adminUserOrg, memberUserOrg]);

    // Generate tokens
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'test-secret';
    adminToken = jwtService.sign(
      {
        id: adminUserId,
        sub: adminUserId,
        email: savedAdmin.email,
        organizationId: orgId,
        role: 'admin',
        platformRole: 'ADMIN',
      },
      { secret: jwtSecret, expiresIn: '1h' },
    );

    memberToken = jwtService.sign(
      {
        id: memberUserId,
        sub: memberUserId,
        email: savedMember.email,
        organizationId: orgId,
        role: 'member',
        platformRole: 'MEMBER',
      },
      { secret: jwtSecret, expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    // Cleanup
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.delete({ organizationId: orgId });

    const userRepo = dataSource.getRepository(User);
    await userRepo.delete({ id: adminUserId });
    await userRepo.delete({ id: memberUserId });

    const orgRepo = dataSource.getRepository(Organization);
    await orgRepo.delete({ id: orgId });

    await app.close();
  });

  describe('POST /api/resources/seed', () => {
    it('should reject member token with 403', async () => {
      await request(app.getHttpServer())
        .post('/resources/seed')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should accept admin token with 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/resources/seed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          // Accept both 200 and 201
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`Expected 200 or 201, got ${res.status}`);
          }
        });

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('organizationId', orgId);
      expect(response.body).toHaveProperty('resources');
      expect(Array.isArray(response.body.resources)).toBe(true);
    });
  });
});
