import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';

describe('Template Recommendations E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;
  let seededTemplateIds: string[] = [];
  let phaseOnlyTemplateId: string;
  let templateCols: Set<string>;

  /**
   * Step 1: Schema detector
   * Returns a Set of column names for a given table
   */
  async function detectColumns(tableName: string): Promise<Set<string>> {
    const result = await dataSource.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
       AND table_name = $1`,
      [tableName],
    );
    return new Set(result.map((row: any) => row.column_name));
  }

  /**
   * Step 3: Safe template seeding with fallback
   * Inserts template using only existing columns
   */
  async function insertTemplateRaw(data: {
    name: string;
    organizationId: string;
    workTypeTags?: string[];
    scopeTags?: string[];
    complexityBucket?: string;
    durationMinDays?: number;
    durationMaxDays?: number;
    setupTimeBucket?: string;
    structureSummary?: any;
    lockPolicy?: any;
    structure?: any;
    phases?: any[];
  }): Promise<string> {
    // Step 1: Build entries as [column, value, type] pairs in final order
    type Entry = [string, any, 'text' | 'text[]' | 'jsonb' | 'uuid' | 'boolean' | 'integer' | 'timestamp'];
    const entries: Entry[] = [];

    // Detect organization_id column name
    const orgIdCol = templateCols.has('organization_id')
      ? 'organization_id'
      : templateCols.has('org_id')
        ? 'org_id'
        : null;

    // Build entries in order
    if (templateCols.has('id')) {
      entries.push(['id', uuidv4(), 'uuid']);
    }

    if (templateCols.has('name')) {
      entries.push(['name', data.name, 'text']);
    }

    if (orgIdCol) {
      entries.push([orgIdCol, data.organizationId, 'uuid']);
    }

    if (templateCols.has('is_active')) {
      entries.push(['is_active', true, 'boolean']);
    }

    if (templateCols.has('methodology')) {
      entries.push(['methodology', 'agile', 'text']);
    }

    if (templateCols.has('scope')) {
      entries.push(['scope', 'organization', 'text']);
    }

    // Sprint 4 columns
    if (templateCols.has('work_type_tags') && data.workTypeTags) {
      entries.push(['work_type_tags', data.workTypeTags, 'text[]']);
    }

    if (templateCols.has('scope_tags') && data.scopeTags) {
      entries.push(['scope_tags', data.scopeTags, 'text[]']);
    }

    if (templateCols.has('complexity_bucket') && data.complexityBucket) {
      entries.push(['complexity_bucket', data.complexityBucket, 'text']);
    }

    if (templateCols.has('duration_min_days') && data.durationMinDays !== undefined) {
      entries.push(['duration_min_days', data.durationMinDays, 'integer']);
    }

    if (templateCols.has('duration_max_days') && data.durationMaxDays !== undefined) {
      entries.push(['duration_max_days', data.durationMaxDays, 'integer']);
    }

    if (templateCols.has('setup_time_bucket') && data.setupTimeBucket) {
      entries.push(['setup_time_bucket', data.setupTimeBucket, 'text']);
    }

    if (templateCols.has('structure_summary') && data.structureSummary) {
      entries.push(['structure_summary', JSON.stringify(data.structureSummary), 'jsonb']);
    }

    if (templateCols.has('lock_policy') && data.lockPolicy) {
      entries.push(['lock_policy', JSON.stringify(data.lockPolicy), 'jsonb']);
    }

    // Structure or phases fallback - structure takes precedence
    if (templateCols.has('structure') && data.structure) {
      entries.push(['structure', JSON.stringify(data.structure), 'jsonb']);
      // Also insert phases into phases column if it exists and structure has phases
      if (templateCols.has('phases') && data.structure.phases && Array.isArray(data.structure.phases) && data.structure.phases.length > 0) {
        entries.push(['phases', JSON.stringify(data.structure.phases), 'jsonb']);
      }
    } else if (templateCols.has('phases')) {
      // If structure column doesn't exist, use phases column
      // Extract phases from data.structure if available, otherwise use data.phases
      if (data.structure && data.structure.phases && Array.isArray(data.structure.phases)) {
        entries.push(['phases', JSON.stringify(data.structure.phases), 'jsonb']);
      } else if (data.phases && Array.isArray(data.phases)) {
        entries.push(['phases', JSON.stringify(data.phases), 'jsonb']);
      }
    }

    if (templateCols.has('created_at')) {
      entries.push(['created_at', new Date(), 'timestamp']);
    }

    if (templateCols.has('updated_at')) {
      entries.push(['updated_at', new Date(), 'timestamp']);
    }

    // Step 2: Filter entries - keep only where templateCols has the column name
    const filteredEntries = entries.filter(([col]) => templateCols.has(col));

    // Step 3: Derive columns, values, and placeholders from the same ordered list
    const columns = filteredEntries.map(([col]) => col);
    const values = filteredEntries.map(([, val]) => val);
    const placeholders: string[] = [];
    let placeholderIndex = 1;

    for (const [col, val, type] of filteredEntries) {
      if (type === 'text[]') {
        // For text arrays, pass as native array - PostgreSQL driver handles it
        placeholders.push(`$${placeholderIndex++}::text[]`);
      } else if (type === 'jsonb') {
        // For JSONB, cast explicitly
        placeholders.push(`$${placeholderIndex++}::jsonb`);
      } else {
        // For other types, plain placeholder
        placeholders.push(`$${placeholderIndex++}`);
      }
    }

    const sql = `INSERT INTO project_templates (${columns.join(', ')})
                 VALUES (${placeholders.join(', ')})
                 RETURNING id`;

    const result = await dataSource.query(sql, values);
    return result[0].id;
  }

  beforeAll(async () => {
    // Prevent demo user restrictions during tests
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    // Use the same ValidationPipe and error filter as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const firstError = errors[0];
          const firstMessage = firstError?.constraints
            ? Object.values(firstError.constraints)[0]
            : 'Invalid request';
          const property = firstError?.property || 'unknown';
          const message = `Query parameter '${property}' is not allowed`;
          return new BadRequestException({
            code: 'VALIDATION_ERROR',
            message,
            errors,
          });
        },
      }),
    );

    // Use the same error filter as main.ts
    app.useGlobalFilters(new ApiErrorFilter());

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Step 1: Detect schema
    templateCols = await detectColumns('project_templates');

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    const testOrg = await orgRepo.save({
      name: `Template Test Org ${Date.now()}`,
      slug: `template-test-org-${Date.now()}`,
      domain: `template-test-${Date.now()}.com`,
    });
    organizationId = testOrg.id;

    // Create test user
    const userRepo = dataSource.getRepository(User);
    const testEmail = `template-test-${Date.now()}@workmgmt-test.com`;
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await userRepo.save({
      email: testEmail,
      firstName: 'Test',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: testOrg.id, // Set organizationId on user entity for JWT generation
    });

    // Link user to organization
    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({
      userId: testUser.id,
      organizationId: testOrg.id,
      role: 'admin' as any,
    });

    // Login and get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      })
      .expect((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200 or 201, got ${res.status}: ${JSON.stringify(res.body)}`);
        }
      });

    authToken = loginResponse.body.accessToken || loginResponse.body.data?.accessToken;
    if (!authToken) {
      throw new Error(`No access token in login response: ${JSON.stringify(loginResponse.body)}`);
    }

    // Create workspace
    const workspaceRepo = dataSource.getRepository(Workspace);
    const testWorkspace = await workspaceRepo.save({
      name: 'Template Test Workspace',
      organizationId: testOrg.id,
      createdBy: testUser.id,
      isPrivate: false,
    });
    workspaceId = testWorkspace.id;

    // Default lock policy for templates
    const defaultLockPolicy = {
      structureLocksOnStart: true,
      lockedItems: ['phaseOrder', 'phaseCount', 'reportingKeys'],
      allowedBeforeStart: [
        'renamePhases',
        'adjustMilestones',
        'addTasks',
        'removeOptionalTasks',
        'assignOwners',
      ],
      allowedAfterStart: [
        'addTasks',
        'renameTasks',
        'updateOwners',
        'updateDates',
        'updateStatus',
      ],
    };

    // Seed 6 templates with varied combinations
    // Template 1: MIGRATION, SINGLE_PROJECT, MEDIUM complexity, SHORT setup
    const template1Id = await insertTemplateRaw({
      name: 'Migration Template 1',
      organizationId,
      workTypeTags: ['MIGRATION'],
      scopeTags: ['SINGLE_PROJECT'],
      complexityBucket: 'MEDIUM',
      setupTimeBucket: 'SHORT',
      structureSummary: { phaseCount: 2, taskCount: 3, milestoneCount: 1 },
      lockPolicy: defaultLockPolicy,
      structure: {
        phases: [
          {
            name: 'Planning',
            sortOrder: 0,
            order: 0,
            isMilestone: false,
            tasks: [
              { title: 'Assess current system', name: 'Assess current system', sortOrder: 0, description: 'Assess current system' },
              { title: 'Define migration scope', name: 'Define migration scope', sortOrder: 1, description: 'Define migration scope' },
            ],
          },
          {
            name: 'Execution',
            sortOrder: 1,
            order: 1,
            isMilestone: true,
            tasks: [
              { title: 'Execute migration', name: 'Execute migration', sortOrder: 0, description: 'Execute migration' },
            ],
          },
        ],
      },
    });
    seededTemplateIds.push(template1Id);

    // Template 2: IMPLEMENTATION, SINGLE_PROJECT, LOW complexity, MEDIUM setup
    const template2Id = await insertTemplateRaw({
      name: 'Implementation Template',
      organizationId,
      workTypeTags: ['IMPLEMENTATION'],
      scopeTags: ['SINGLE_PROJECT'],
      complexityBucket: 'LOW',
      setupTimeBucket: 'MEDIUM',
      structureSummary: { phaseCount: 2, taskCount: 3, milestoneCount: 0 },
      lockPolicy: defaultLockPolicy,
      structure: {
        phases: [
          {
            name: 'Design',
            sortOrder: 0,
            order: 0,
            isMilestone: false,
            tasks: [
              { title: 'Create design docs', name: 'Create design docs', sortOrder: 0, description: 'Create design docs' },
              { title: 'Review design', name: 'Review design', sortOrder: 1, description: 'Review design' },
            ],
          },
          {
            name: 'Build',
            sortOrder: 1,
            order: 1,
            isMilestone: false,
            tasks: [
              { title: 'Implement features', name: 'Implement features', sortOrder: 0, description: 'Implement features' },
            ],
          },
        ],
      },
    });
    seededTemplateIds.push(template2Id);

    // Template 3: SYSTEM_TRANSITION, MULTI_PROJECT, HIGH complexity, LONGER setup
    const template3Id = await insertTemplateRaw({
      name: 'System Transition Template',
      organizationId,
      workTypeTags: ['SYSTEM_TRANSITION'],
      scopeTags: ['MULTI_PROJECT'],
      complexityBucket: 'HIGH',
      setupTimeBucket: 'LONGER',
      structureSummary: { phaseCount: 2, taskCount: 3, milestoneCount: 1 },
      lockPolicy: defaultLockPolicy,
      structure: {
        phases: [
          {
            name: 'Assessment',
            sortOrder: 0,
            order: 0,
            isMilestone: false,
            tasks: [
              { title: 'Assess current state', name: 'Assess current state', sortOrder: 0, description: 'Assess current state' },
              { title: 'Identify risks', name: 'Identify risks', sortOrder: 1, description: 'Identify risks' },
            ],
          },
          {
            name: 'Transition',
            sortOrder: 1,
            order: 1,
            isMilestone: true,
            tasks: [
              { title: 'Execute transition', name: 'Execute transition', sortOrder: 0, description: 'Execute transition' },
            ],
          },
        ],
      },
    });
    seededTemplateIds.push(template3Id);

    // Template 4: INTEGRATION, SINGLE_PROJECT, MEDIUM complexity, SHORT setup
    const template4Id = await insertTemplateRaw({
      name: 'Integration Template',
      organizationId,
      workTypeTags: ['INTEGRATION'],
      scopeTags: ['SINGLE_PROJECT'],
      complexityBucket: 'MEDIUM',
      setupTimeBucket: 'SHORT',
      structureSummary: { phaseCount: 2, taskCount: 2, milestoneCount: 0 },
      lockPolicy: defaultLockPolicy,
      structure: {
        phases: [
          {
            name: 'Setup',
            sortOrder: 0,
            order: 0,
            isMilestone: false,
            tasks: [
              { title: 'Configure integration', name: 'Configure integration', sortOrder: 0, description: 'Configure integration' },
            ],
          },
          {
            name: 'Test',
            sortOrder: 1,
            order: 1,
            isMilestone: false,
            tasks: [
              { title: 'Test integration', name: 'Test integration', sortOrder: 0, description: 'Test integration' },
            ],
          },
        ],
      },
    });
    seededTemplateIds.push(template4Id);

    // Template 5: MIGRATION, MULTI_PROJECT, MEDIUM complexity, MEDIUM setup
    const template5Id = await insertTemplateRaw({
      name: 'Multi-Project Migration',
      organizationId,
      workTypeTags: ['MIGRATION'],
      scopeTags: ['MULTI_PROJECT'],
      complexityBucket: 'MEDIUM',
      setupTimeBucket: 'MEDIUM',
      structureSummary: { phaseCount: 1, taskCount: 1, milestoneCount: 0 },
      lockPolicy: defaultLockPolicy,
      structure: {
        phases: [
          {
            name: 'Phase 1',
            sortOrder: 0,
            order: 0,
            isMilestone: false,
            tasks: [
              { title: 'Task 1', name: 'Task 1', sortOrder: 0, description: 'Task 1' },
            ],
          },
        ],
      },
    });
    seededTemplateIds.push(template5Id);

    // Template 6: Phase-only template (zero tasks)
    // Step 3: Build structure and validate before insertion
    const phaseOnlyStructure = {
      phases: [
        {
          name: 'Phase 1',
          sortOrder: 0,
          order: 0,
          isMilestone: false,
          tasks: [], // Must exist as empty array, not omitted
        },
      ],
    };

    // Proof query: Assert structure is correct before insertion
    expect(phaseOnlyStructure.phases.length).toBe(1);
    expect(phaseOnlyStructure.phases[0].name).toBe('Phase 1');
    expect(Array.isArray(phaseOnlyStructure.phases[0].tasks)).toBe(true);
    expect(phaseOnlyStructure.phases[0].tasks.length).toBe(0);

    const template6Id = await insertTemplateRaw({
      name: 'Phase Only Template',
      organizationId,
      workTypeTags: ['MIGRATION'],
      scopeTags: ['SINGLE_PROJECT'],
      complexityBucket: 'LOW',
      setupTimeBucket: 'SHORT',
      structureSummary: { phaseCount: 1, taskCount: 0, milestoneCount: 0 },
      lockPolicy: defaultLockPolicy,
      structure: phaseOnlyStructure,
    });
    seededTemplateIds.push(template6Id);
    phaseOnlyTemplateId = template6Id;

    // Step 4: Post-insert validation query
    // Check which column exists (structure or phases)
    if (templateCols.has('structure')) {
      const postInsertResult = await dataSource.query(
        `SELECT structure::text FROM project_templates WHERE id = $1`,
        [template6Id],
      );
      expect(postInsertResult.length).toBe(1);
      const storedStructure = JSON.parse(postInsertResult[0].structure);
      expect(storedStructure.phases).toBeDefined();
      expect(Array.isArray(storedStructure.phases)).toBe(true);
      expect(storedStructure.phases.length).toBe(1);
      expect(storedStructure.phases[0].name).toBe('Phase 1');
      expect(Array.isArray(storedStructure.phases[0].tasks)).toBe(true);
    } else if (templateCols.has('phases')) {
      const postInsertResult = await dataSource.query(
        `SELECT phases::text FROM project_templates WHERE id = $1`,
        [template6Id],
      );
      expect(postInsertResult.length).toBe(1);
      const storedPhases = JSON.parse(postInsertResult[0].phases);
      expect(Array.isArray(storedPhases)).toBe(true);
      expect(storedPhases.length).toBe(1);
      expect(storedPhases[0].name).toBe('Phase 1');
      expect(Array.isArray(storedPhases[0].tasks)).toBe(true);
    }
  });

  afterAll(async () => {
    // Cleanup seeded templates
    if (seededTemplateIds.length > 0) {
      await dataSource.query('DELETE FROM project_templates WHERE id = ANY($1::uuid[])', [
        seededTemplateIds,
      ]);
    }

    // Cleanup test data
    const workspaceRepo = dataSource.getRepository(Workspace);
    await workspaceRepo.delete({ organizationId });

    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.delete({ organizationId });

    const userRepo = dataSource.getRepository(User);
    await userRepo
      .createQueryBuilder()
      .delete()
      .where('email LIKE :pattern', { pattern: '%@workmgmt-test.com' })
      .execute();

    const orgRepo = dataSource.getRepository(Organization);
    await orgRepo.delete({ id: organizationId });

    await app.close();
  });

  // Step 2: Schema assertion test (fail fast)
  describe('Schema includes required template columns for Sprint 4', () => {
    it('should have all required columns for Sprint 4 E2E correctness', () => {
      const required = [
        'work_type_tags',
        'scope_tags',
        'setup_time_bucket',
        'lock_policy',
        'structure_summary',
      ];

      const missing: string[] = [];
      for (const col of required) {
        if (!templateCols.has(col)) {
          missing.push(col);
        }
      }

      // Require at least one of structure OR phases
      const hasStructure = templateCols.has('structure');
      const hasPhases = templateCols.has('phases');
      const hasStructureOrPhases = hasStructure || hasPhases;

      if (missing.length > 0 || !hasStructureOrPhases) {
        let message = `Missing required columns in project_templates: ${missing.join(', ')}\n`;
        message += `Expected migration: 1768000000000-AddSprint4TemplateRecommendationFields\n`;
        message += `Action: ensure test database runs migrations in CI before E2E\n`;

        if (!hasStructureOrPhases) {
          message += `Also missing structure/phases. Template preview and instantiate cannot work.`;
        }

        throw new Error(message);
      }

      // Test passes if we get here
      expect(templateCols.size).toBeGreaterThan(0);
    });
  });

  describe('Test 1: Deterministic ordering', () => {
    it('should return identical results on repeated calls', async () => {
      const queryParams = {
        containerType: 'PROJECT',
        workType: 'MIGRATION',
        durationDays: '90',
        complexity: 'MEDIUM',
      };

      // First call
      const response1 = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      expect(response1.body.data).toBeDefined();
      expect(response1.body.data.recommended).toBeDefined();
      expect(response1.body.data.others).toBeDefined();

      const recommended1 = response1.body.data.recommended.map((t: any) => t.templateId);
      const others1 = response1.body.data.others.map((t: any) => t.templateId);
      const reasonCodes1 = response1.body.data.recommended.map((t: any) => t.reasonCodes);

      // Second call
      const response2 = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query(queryParams)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      const recommended2 = response2.body.data.recommended.map((t: any) => t.templateId);
      const others2 = response2.body.data.others.map((t: any) => t.templateId);
      const reasonCodes2 = response2.body.data.recommended.map((t: any) => t.reasonCodes);

      // Assert identical order
      expect(recommended1).toEqual(recommended2);
      expect(others1).toEqual(others2);
      expect(reasonCodes1).toEqual(reasonCodes2);
    });
  });

  describe('Test 2: Max sizes enforced', () => {
    it('should return recommended <= 3 and others <= 12', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query({
          containerType: 'PROJECT',
          workType: 'MIGRATION',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      expect(response.body.data.recommended.length).toBeLessThanOrEqual(3);
      expect(response.body.data.others.length).toBeLessThanOrEqual(12);
    });
  });

  describe('Test 3: Reason codes and labels', () => {
    it('should have valid reason codes and labels for each recommended item', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query({
          containerType: 'PROJECT',
          workType: 'MIGRATION',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      const recommended = response.body.data.recommended;
      const { REASON_LABELS } = require('../src/modules/templates/enums/template.enums');

      for (const item of recommended) {
        // Reason codes length is 1 or 2
        expect(item.reasonCodes.length).toBeGreaterThanOrEqual(1);
        expect(item.reasonCodes.length).toBeLessThanOrEqual(2);

        // Reason labels length equals reason codes length
        expect(item.reasonLabels.length).toBe(item.reasonCodes.length);

        // Each label matches backend mapping
        for (let i = 0; i < item.reasonCodes.length; i++) {
          expect(item.reasonLabels[i]).toBe(REASON_LABELS[item.reasonCodes[i]]);
        }

        // lockSummary exists and contains no newlines
        expect(item.lockSummary).toBeDefined();
        expect(typeof item.lockSummary).toBe('string');
        expect(item.lockSummary).not.toContain('\n');
        expect(item.lockSummary).not.toContain('\r');
      }
    });
  });

  describe('Test 4: Reject unknown query params', () => {
    it('should reject userId param with 400 VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query({
          containerType: 'PROJECT',
          workType: 'MIGRATION',
          userId: '123',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(400);

      // Debug: log actual response
      console.log('Validation error response body:', JSON.stringify(response.body, null, 2));
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('userId');
    });
  });

  describe('Test 5: Preview shape contract', () => {
    it('should return valid preview shape for template with tasks', async () => {
      const templateId = seededTemplateIds[0];

      const response = await request(app.getHttpServer())
        .get(`/api/templates/${templateId}/preview-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      const preview = response.body.data;

      // Required fields
      expect(preview.templateId).toBe(templateId);
      expect(preview.templateName).toBeDefined();
      expect(typeof preview.phaseCount).toBe('number');
      expect(preview.phaseCount).toBeGreaterThanOrEqual(1);
      expect(typeof preview.taskCount).toBe('number');
      expect(preview.taskCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(preview.phases)).toBe(true);

      // Phases ordered by sortOrder
      for (let i = 1; i < preview.phases.length; i++) {
        expect(preview.phases[i].sortOrder).toBeGreaterThanOrEqual(preview.phases[i - 1].sortOrder);
      }

      // Lock policy
      expect(preview.lockPolicy).toBeDefined();
      expect(preview.lockPolicy.structureLocksOnStart).toBe(true);
      expect(Array.isArray(preview.lockPolicy.lockedItems)).toBe(true);

      // Allowed operations
      expect(Array.isArray(preview.allowedBeforeStart)).toBe(true);
      expect(preview.allowedBeforeStart).toContain('renamePhases');
      expect(preview.allowedBeforeStart).toContain('addTasks');

      expect(Array.isArray(preview.allowedAfterStart)).toBe(true);
      expect(preview.allowedAfterStart).toContain('addTasks');
      expect(preview.allowedAfterStart).toContain('updateStatus');
    });

    it('should return valid preview for phase-only template', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/templates/${phaseOnlyTemplateId}/preview-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      const preview = response.body.data;

      expect(preview.taskCount).toBe(0);
      expect(preview.phases.length).toBeGreaterThanOrEqual(1);

      // All phases should have taskCount 0
      for (const phase of preview.phases) {
        expect(phase.taskCount).toBe(0);
      }
    });
  });

  describe('Test 6: Workspace required', () => {
    it('should require x-workspace-id for recommendations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query({
          containerType: 'PROJECT',
          workType: 'MIGRATION',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.code).toBe('WORKSPACE_REQUIRED');
      expect(response.body.message).toBeDefined();
    });

    it('should require x-workspace-id for preview', async () => {
      const templateId = seededTemplateIds[0];

      const response = await request(app.getHttpServer())
        .get(`/api/templates/${templateId}/preview-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.code).toBe('WORKSPACE_REQUIRED');
      expect(response.body.message).toBeDefined();
    });
  });
});
