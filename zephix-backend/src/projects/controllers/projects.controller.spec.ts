import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppModule } from '../../app.module';
import { Project } from '../entities/project.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Role, RoleType } from '../entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

/**
 * Projects Controller Integration Tests
 * 
 * Comprehensive integration test suite for the ProjectsController covering
 * all endpoints, authentication, authorization, and error scenarios.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let teamRepository: Repository<Team>;
  let teamMemberRepository: Repository<TeamMember>;
  let roleRepository: Repository<Role>;

  let testUser: User;
  let testProject: Project;
  let testTeam: Team;
  let testRole: Role;
  let testTeamMember: TeamMember;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleFixture.get<Repository<Project>>(getRepositoryToken(Project));
    teamRepository = moduleFixture.get<Repository<Team>>(getRepositoryToken(Team));
    teamMemberRepository = moduleFixture.get<Repository<TeamMember>>(getRepositoryToken(TeamMember));
    roleRepository = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
  });

  beforeEach(async () => {
    // Create test user
    testUser = userRepository.create({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'hashedPassword',
    });
    await userRepository.save(testUser);

    // Create test role
    testRole = roleRepository.create({
      name: RoleType.ADMIN,
      description: 'Admin role for testing',
      permissions: ['read', 'write', 'delete'],
    });
    await roleRepository.save(testRole);

    // Generate auth token
    authToken = jwtService.sign({ 
      sub: testUser.id, 
      email: testUser.email 
    });
  });

  afterEach(async () => {
    // Clean up test data
    await teamMemberRepository.delete({});
    await teamRepository.delete({});
    await projectRepository.delete({});
    await roleRepository.delete({});
    await userRepository.delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/projects', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'Test Project',
      description: 'Test project description',
      status: 'planning' as any,
      priority: 'high' as any,
    };

    it('should create a project successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProjectDto)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Project created successfully');
      expect(response.body.project).toHaveProperty('name', createProjectDto.name);
      expect(response.body.project).toHaveProperty('description', createProjectDto.description);
      expect(response.body.project).toHaveProperty('status', createProjectDto.status);
      expect(response.body.project).toHaveProperty('priority', createProjectDto.priority);
      expect(response.body.project).toHaveProperty('createdById', testUser.id);
    });

    it('should return 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send(createProjectDto)
        .expect(401);
    });

    it('should return 400 when invalid data provided', async () => {
      const invalidDto = {
        name: '', // Invalid: empty name
        description: 'Test description',
      };

      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 when required fields missing', async () => {
      const invalidDto = {
        description: 'Test description',
        // Missing required 'name' field
      };

      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      // Create test project and team
      testProject = projectRepository.create({
        name: 'Test Project',
        description: 'Test project description',
        status: 'active' as any,
        priority: 'medium' as any,
        createdBy: testUser,
        createdById: testUser.id,
      });
      await projectRepository.save(testProject);

      testTeam = teamRepository.create({
        name: 'Test Team',
        description: 'Test team description',
        project: testProject,
        projectId: testProject.id,
      });
      await teamRepository.save(testTeam);

      testTeamMember = teamMemberRepository.create({
        team: testTeam,
        teamId: testTeam.id,
        user: testUser,
        userId: testUser.id,
        role: testRole,
        roleId: testRole.id,
        joinedAt: new Date(),
      });
      await teamMemberRepository.save(testTeamMember);
    });

    it('should return all projects for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Projects retrieved successfully');
      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);
      expect(response.body.projects[0]).toHaveProperty('name', 'Test Project');
    });

    it('should return 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/projects')
        .expect(401);
    });

    it('should return empty array when user has no projects', async () => {
      // Create another user without projects
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'hashedPassword',
      });
      await userRepository.save(otherUser);

      const otherUserToken = jwtService.sign({ 
        sub: otherUser.id, 
        email: otherUser.email 
      });

      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.projects).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    beforeEach(async () => {
      // Create test project and team
      testProject = projectRepository.create({
        name: 'Test Project',
        description: 'Test project description',
        status: 'active' as any,
        priority: 'medium' as any,
        createdBy: testUser,
        createdById: testUser.id,
      });
      await projectRepository.save(testProject);

      testTeam = teamRepository.create({
        name: 'Test Team',
        description: 'Test team description',
        project: testProject,
        projectId: testProject.id,
      });
      await teamRepository.save(testTeam);

      testTeamMember = teamMemberRepository.create({
        team: testTeam,
        teamId: testTeam.id,
        user: testUser,
        userId: testUser.id,
        role: testRole,
        roleId: testRole.id,
        joinedAt: new Date(),
      });
      await teamMemberRepository.save(testTeamMember);
    });

    it('should return project by id for team member', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Project retrieved successfully');
      expect(response.body.project).toHaveProperty('id', testProject.id);
      expect(response.body.project).toHaveProperty('name', 'Test Project');
    });

    it('should return 404 when project not found', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 when user is not team member', async () => {
      // Create another user who is not a team member
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'hashedPassword',
      });
      await userRepository.save(otherUser);

      const otherUserToken = jwtService.sign({ 
        sub: otherUser.id, 
        email: otherUser.email 
      });

      await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should return 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`)
        .expect(401);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    beforeEach(async () => {
      // Create test project and team
      testProject = projectRepository.create({
        name: 'Test Project',
        description: 'Test project description',
        status: 'active' as any,
        priority: 'medium' as any,
        createdBy: testUser,
        createdById: testUser.id,
      });
      await projectRepository.save(testProject);

      testTeam = teamRepository.create({
        name: 'Test Team',
        description: 'Test team description',
        project: testProject,
        projectId: testProject.id,
      });
      await teamRepository.save(testTeam);

      testTeamMember = teamMemberRepository.create({
        team: testTeam,
        teamId: testTeam.id,
        user: testUser,
        userId: testUser.id,
        role: testRole,
        roleId: testRole.id,
        joinedAt: new Date(),
      });
      await teamMemberRepository.save(testTeamMember);
    });

    it('should update project successfully', async () => {
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project Name',
        description: 'Updated project description',
        status: 'completed' as any,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProjectDto)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Project updated successfully');
      expect(response.body.project).toHaveProperty('name', updateProjectDto.name);
      expect(response.body.project).toHaveProperty('description', updateProjectDto.description);
      expect(response.body.project).toHaveProperty('status', updateProjectDto.status);
    });

    it('should return 404 when project not found', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      await request(app.getHttpServer())
        .patch(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProjectDto)
        .expect(404);
    });

    it('should return 401 when no token provided', async () => {
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      await request(app.getHttpServer())
        .patch(`/api/projects/${testProject.id}`)
        .send(updateProjectDto)
        .expect(401);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    beforeEach(async () => {
      // Create test project and team
      testProject = projectRepository.create({
        name: 'Test Project',
        description: 'Test project description',
        status: 'active' as any,
        priority: 'medium' as any,
        createdBy: testUser,
        createdById: testUser.id,
      });
      await projectRepository.save(testProject);

      testTeam = teamRepository.create({
        name: 'Test Team',
        description: 'Test team description',
        project: testProject,
        projectId: testProject.id,
      });
      await teamRepository.save(testTeam);

      testTeamMember = teamMemberRepository.create({
        team: testTeam,
        teamId: testTeam.id,
        user: testUser,
        userId: testUser.id,
        role: testRole,
        roleId: testRole.id,
        joinedAt: new Date(),
      });
      await teamMemberRepository.save(testTeamMember);
    });

    it('should delete project successfully for admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when project not found', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .delete(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${testProject.id}`)
        .expect(401);
    });
  });

  describe('Team Management Endpoints', () => {
    beforeEach(async () => {
      // Create test project and team
      testProject = projectRepository.create({
        name: 'Test Project',
        description: 'Test project description',
        status: 'active' as any,
        priority: 'medium' as any,
        createdBy: testUser,
        createdById: testUser.id,
      });
      await projectRepository.save(testProject);

      testTeam = teamRepository.create({
        name: 'Test Team',
        description: 'Test team description',
        project: testProject,
        projectId: testProject.id,
      });
      await teamRepository.save(testTeam);

      testTeamMember = teamMemberRepository.create({
        team: testTeam,
        teamId: testTeam.id,
        user: testUser,
        userId: testUser.id,
        role: testRole,
        roleId: testRole.id,
        joinedAt: new Date(),
      });
      await teamMemberRepository.save(testTeamMember);
    });

    describe('POST /api/projects/:id/team/members', () => {
      it('should add team member successfully', async () => {
        const newUser = userRepository.create({
          email: 'newmember@example.com',
          firstName: 'New',
          lastName: 'Member',
          password: 'hashedPassword',
        });
        await userRepository.save(newUser);

        const addTeamMemberDto = {
          userId: newUser.id,
          role: RoleType.EDITOR,
        };

        const response = await request(app.getHttpServer())
          .post(`/api/projects/${testProject.id}/team/members`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(addTeamMemberDto)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'Team member added successfully');
        expect(response.body.teamMember).toHaveProperty('userId', newUser.id);
      });

      it('should return 409 when user is already a team member', async () => {
        const addTeamMemberDto = {
          userId: testUser.id, // Already a team member
          role: RoleType.EDITOR,
        };

        await request(app.getHttpServer())
          .post(`/api/projects/${testProject.id}/team/members`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(addTeamMemberDto)
          .expect(409);
      });
    });

    describe('PATCH /api/projects/:id/team/members/:memberId', () => {
      it('should update team member role successfully', async () => {
        const updateTeamMemberDto = {
          role: RoleType.EDITOR,
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/projects/${testProject.id}/team/members/${testTeamMember.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateTeamMemberDto)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Team member updated successfully');
      });
    });

    describe('DELETE /api/projects/:id/team/members/:memberId', () => {
      it('should remove team member successfully', async () => {
        await request(app.getHttpServer())
          .delete(`/api/projects/${testProject.id}/team/members/${testTeamMember.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
      });
    });
  });
});
