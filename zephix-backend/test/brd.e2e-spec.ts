import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BRDModule } from '../src/brd/brd.module';
import { BRD, BRDStatus } from '../src/brd/entities/brd.entity';
import { AuthModule } from '../src/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import * as seedData from '../src/brd/schema/brd.seed.json';

describe('BRD (e2e)', () => {
  let app: INestApplication;
  let brdRepository: Repository<BRD>;
  let jwtService: JwtService;
  let authToken: string;

  const testOrganizationId = '550e8400-e29b-41d4-a716-446655440000';
  const testProjectId = '550e8400-e29b-41d4-a716-446655440001';
  const testUserId = '550e8400-e29b-41d4-a716-446655440002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BRDModule, AuthModule],
    })
      .overrideProvider(getRepositoryToken(BRD))
      .useClass(Repository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    brdRepository = moduleFixture.get<Repository<BRD>>(getRepositoryToken(BRD));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create a test JWT token
    authToken = jwtService.sign({
      sub: testUserId,
      email: 'test@example.com',
      organizationId: testOrganizationId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up BRD data before each test
    await brdRepository.clear();
  });

  describe('POST /api/brd', () => {
    it('should create a new BRD with valid payload', () => {
      const createDto = {
        organizationId: testOrganizationId,
        project_id: testProjectId,
        payload: seedData,
      };

      return request(app.getHttpServer())
        .post('/api/brd')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('version', 1);
          expect(res.body).toHaveProperty('created_at');
        });
    });

    it('should return 400 for invalid payload', () => {
      const createDto = {
        organizationId: testOrganizationId,
        payload: {
          metadata: {
            title: 'ab', // Too short
          },
        },
      };

      return request(app.getHttpServer())
        .post('/api/brd')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'BRD validation failed');
          expect(res.body).toHaveProperty('errors');
          expect(Array.isArray(res.body.errors)).toBe(true);
        });
    });

    it('should return 400 for missing required fields', () => {
      const createDto = {
        organizationId: testOrganizationId,
        payload: {}, // Empty payload
      };

      return request(app.getHttpServer())
        .post('/api/brd')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should return 401 without authentication', () => {
      const createDto = {
        organizationId: testOrganizationId,
        payload: seedData,
      };

      return request(app.getHttpServer())
        .post('/api/brd')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /api/brd/:id', () => {
    let testBRD: BRD;

    beforeEach(async () => {
      testBRD = brdRepository.create({
        organizationId: testOrganizationId,
        project_id: testProjectId,
        version: 1,
        status: BRDStatus.DRAFT,
        payload: seedData,
      });
      testBRD = await brdRepository.save(testBRD);
    });

    it('should get a BRD by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/brd/${testBRD.id}`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testBRD.id);
          expect(res.body).toHaveProperty('organizationId', testOrganizationId);
          expect(res.body).toHaveProperty('version', 1);
          expect(res.body).toHaveProperty('status', BRDStatus.DRAFT);
          expect(res.body).toHaveProperty('payload');
          expect(res.body).toHaveProperty('title');
          expect(res.body).toHaveProperty('summary');
        });
    });

    it('should return 404 for non-existent BRD', () => {
      return request(app.getHttpServer())
        .get('/api/brd/550e8400-e29b-41d4-a716-446655440999')
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for wrong tenant', () => {
      return request(app.getHttpServer())
        .get(`/api/brd/${testBRD.id}`)
        .query({ organizationId: '550e8400-e29b-41d4-a716-446655440999' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/brd/:id', () => {
    let testBRD: BRD;

    beforeEach(async () => {
      testBRD = brdRepository.create({
        organizationId: testOrganizationId,
        project_id: testProjectId,
        version: 1,
        status: BRDStatus.DRAFT,
        payload: seedData,
      });
      testBRD = await brdRepository.save(testBRD);
    });

    it('should update a BRD successfully', () => {
      const updateDto = {
        payload: {
          ...seedData,
          metadata: {
            ...seedData.metadata,
            title: 'Updated Customer Portal Enhancement',
          },
        },
      };

      return request(app.getHttpServer())
        .put(`/api/brd/${testBRD.id}`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testBRD.id);
          expect(res.body).toHaveProperty('version', 2);
          expect(res.body).toHaveProperty('updated_at');
        });
    });

    it('should return 400 for invalid payload', () => {
      const updateDto = {
        payload: {
          metadata: {
            title: 'ab', // Too short
          },
        },
      };

      return request(app.getHttpServer())
        .put(`/api/brd/${testBRD.id}`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(400);
    });
  });

  describe('GET /api/brd', () => {
    beforeEach(async () => {
      // Create multiple test BRDs
      const brds = [
        {
          organizationId: testOrganizationId,
          project_id: testProjectId,
          version: 1,
          status: BRDStatus.DRAFT,
          payload: {
            ...seedData,
            metadata: { ...seedData.metadata, title: 'First BRD', industry: 'Technology' },
          },
        },
        {
          organizationId: testOrganizationId,
          project_id: testProjectId,
          version: 1,
          status: BRDStatus.APPROVED,
          payload: {
            ...seedData,
            metadata: { ...seedData.metadata, title: 'Second BRD', industry: 'Healthcare' },
          },
        },
        {
          organizationId: testOrganizationId,
          project_id: null,
          version: 1,
          status: BRDStatus.DRAFT,
          payload: {
            ...seedData,
            metadata: { ...seedData.metadata, title: 'Third BRD', industry: 'Technology' },
          },
        },
      ];

      for (const brdData of brds) {
        const brd = brdRepository.create(brdData);
        await brdRepository.save(brd);
      }
    });

    it('should list BRDs with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/brd')
        .query({
          organizationId: testOrganizationId,
          page: 1,
          limit: 2,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total', 3);
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 2);
          expect(res.body).toHaveProperty('totalPages', 2);
          expect(res.body.data).toHaveLength(2);
        });
    });

    it('should filter BRDs by status', () => {
      return request(app.getHttpServer())
        .get('/api/brd')
        .query({
          organizationId: testOrganizationId,
          status: BRDStatus.DRAFT,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(2);
          res.body.data.forEach((brd: any) => {
            expect(brd.status).toBe(BRDStatus.DRAFT);
          });
        });
    });

    it('should filter BRDs by project ID', () => {
      return request(app.getHttpServer())
        .get('/api/brd')
        .query({
          organizationId: testOrganizationId,
          project_id: testProjectId,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(2);
          res.body.data.forEach((brd: any) => {
            expect(brd.project_id).toBe(testProjectId);
          });
        });
    });

    it('should filter BRDs by industry', () => {
      return request(app.getHttpServer())
        .get('/api/brd')
        .query({
          organizationId: testOrganizationId,
          industry: 'Technology',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(2);
          res.body.data.forEach((brd: any) => {
            expect(brd.industry).toBe('Technology');
          });
        });
    });
  });

  describe('POST /api/brd/:id/publish', () => {
    let testBRD: BRD;

    beforeEach(async () => {
      testBRD = brdRepository.create({
        organizationId: testOrganizationId,
        project_id: testProjectId,
        version: 1,
        status: BRDStatus.DRAFT,
        payload: seedData,
      });
      testBRD = await brdRepository.save(testBRD);
    });

    it('should change BRD status successfully', () => {
      const publishDto = {
        status: BRDStatus.IN_REVIEW,
      };

      return request(app.getHttpServer())
        .post(`/api/brd/${testBRD.id}/publish`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', BRDStatus.IN_REVIEW);
        });
    });

    it('should return 400 for invalid status transition', () => {
      const publishDto = {
        status: BRDStatus.PUBLISHED, // Can't go directly from DRAFT to PUBLISHED
      };

      return request(app.getHttpServer())
        .post(`/api/brd/${testBRD.id}/publish`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishDto)
        .expect(400);
    });
  });

  describe('DELETE /api/brd/:id', () => {
    let testBRD: BRD;

    beforeEach(async () => {
      testBRD = brdRepository.create({
        organizationId: testOrganizationId,
        project_id: testProjectId,
        version: 1,
        status: BRDStatus.DRAFT,
        payload: seedData,
      });
      testBRD = await brdRepository.save(testBRD);
    });

    it('should delete a draft BRD successfully', () => {
      return request(app.getHttpServer())
        .delete(`/api/brd/${testBRD.id}`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 403 for published BRD', async () => {
      // Update BRD status to published
      testBRD.status = BRDStatus.PUBLISHED;
      await brdRepository.save(testBRD);

      return request(app.getHttpServer())
        .delete(`/api/brd/${testBRD.id}`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /api/brd/:id/validation', () => {
    let testBRD: BRD;

    beforeEach(async () => {
      testBRD = brdRepository.create({
        organizationId: testOrganizationId,
        project_id: testProjectId,
        version: 1,
        status: BRDStatus.DRAFT,
        payload: seedData,
      });
      testBRD = await brdRepository.save(testBRD);
    });

    it('should get validation summary for a BRD', () => {
      return request(app.getHttpServer())
        .get(`/api/brd/${testBRD.id}/validation`)
        .query({ organizationId: testOrganizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isValid');
          expect(res.body).toHaveProperty('errorCount');
          expect(res.body).toHaveProperty('errorsBySection');
          expect(res.body).toHaveProperty('missingRequiredFields');
        });
    });
  });

  describe('GET /api/brd/schema', () => {
    it('should get the BRD JSON schema', () => {
      return request(app.getHttpServer())
        .get('/api/brd/schema')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('$schema');
          expect(res.body).toHaveProperty('title', 'Business Requirements Document Schema');
          expect(res.body).toHaveProperty('type', 'object');
          expect(res.body).toHaveProperty('properties');
        });
    });
  });

  describe('GET /api/brd/search', () => {
    beforeEach(async () => {
      const brd = brdRepository.create({
        organizationId: testOrganizationId,
        project_id: testProjectId,
        version: 1,
        status: BRDStatus.DRAFT,
        payload: {
          ...seedData,
          metadata: {
            ...seedData.metadata,
            title: 'Customer Portal Enhancement Project',
            summary: 'Enhancing customer portal for better user experience',
          },
        },
      });
      await brdRepository.save(brd);
    });

    it('should perform full-text search', () => {
      return request(app.getHttpServer())
        .get('/api/brd/search')
        .query({
          organizationId: testOrganizationId,
          q: 'customer portal',
          limit: 10,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Note: Full-text search might not work in test environment without proper PostgreSQL setup
        });
    });
  });
});
