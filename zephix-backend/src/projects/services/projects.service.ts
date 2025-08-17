import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Role, RoleType } from '../entities/role.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    user: User,
    organizationId: string,
  ): Promise<Project> {
    // Create project
    const project = this.projectRepository.create({
      ...createProjectDto,
      createdById: user.id,
      organizationId,
    });

    const savedProject = await this.projectRepository.save(project);

    // Create team for the project
    const team = this.teamRepository.create({
      name: `${savedProject.name} Team`,
      description: `Team for ${savedProject.name} project`,
      projectId: savedProject.id,
      organizationId,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Add creator as admin
    const adminRole = await this.roleRepository.findOne({
      where: { name: RoleType.ADMIN },
    });
    if (adminRole) {
      const teamMember = this.teamMemberRepository.create({
        teamId: savedTeam.id,
        userId: user.id,
        roleId: adminRole.id,
        organizationId,
        joinedAt: new Date(),
      });
      await this.teamMemberRepository.save(teamMember);
    }

    return this.findOne(savedProject.id);
  }

  async findAll(user: User, organizationId: string): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.team', 'team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('members.role', 'memberRole')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .where('members.userId = :userId', { userId: user.id })
      .andWhere('project.organizationId = :organizationId', { organizationId })
      .getMany();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: [
        'team',
        'team.members',
        'team.members.user',
        'team.members.role',
        'createdBy',
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id);

    // Check if user has permission to update (admin or editor)
    await this.checkUserPermission(project.id, user.id, [
      RoleType.ADMIN,
      RoleType.EDITOR,
    ]);

    Object.assign(project, updateProjectDto);
    await this.projectRepository.save(project);

    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id);

    // Check if user has admin permission to delete
    await this.checkUserPermission(project.id, user.id, [RoleType.ADMIN]);

    await this.projectRepository.remove(project);
  }

  async addTeamMember(
    projectId: string,
    addTeamMemberDto: AddTeamMemberDto,
    requestingUser: User,
  ): Promise<TeamMember> {
    const project = await this.findOne(projectId);

    // Check if requesting user has permission to add team members
    await this.checkUserPermission(project.id, requestingUser.id, [
      RoleType.ADMIN,
      RoleType.EDITOR,
    ]);

    // Check if user is already a team member
    const existingMember = await this.teamMemberRepository.findOne({
      where: {
        teamId: project.team.id,
        userId: addTeamMemberDto.userId,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a team member');
    }

    // Get the role
    const role = await this.roleRepository.findOne({
      where: { name: addTeamMemberDto.role },
    });

    if (!role) {
      throw new NotFoundException(`Role ${addTeamMemberDto.role} not found`);
    }

    // Create team member
    const teamMember = this.teamMemberRepository.create({
      teamId: project.team.id,
      userId: addTeamMemberDto.userId,
      roleId: role.id,
      organizationId: project.organizationId,
      joinedAt: new Date(),
    });

    return this.teamMemberRepository.save(teamMember);
  }

  async updateTeamMember(
    projectId: string,
    memberId: string,
    updateTeamMemberDto: UpdateTeamMemberDto,
    requestingUser: User,
  ): Promise<TeamMember> {
    // Check if requesting user has admin permission
    await this.checkUserPermission(projectId, requestingUser.id, [
      RoleType.ADMIN,
    ]);

    const teamMember = await this.teamMemberRepository.findOne({
      where: { id: memberId },
      relations: ['team', 'role'],
    });

    if (!teamMember || teamMember.team.projectId !== projectId) {
      throw new NotFoundException('Team member not found');
    }

    const newRole = await this.roleRepository.findOne({
      where: { name: updateTeamMemberDto.role },
    });
    if (!newRole) {
      throw new NotFoundException(`Role ${updateTeamMemberDto.role} not found`);
    }

    teamMember.role = newRole;
    return this.teamMemberRepository.save(teamMember);
  }

  async removeTeamMember(
    projectId: string,
    memberId: string,
    requestingUser: User,
  ): Promise<void> {
    // Check if requesting user has admin permission
    await this.checkUserPermission(projectId, requestingUser.id, [
      RoleType.ADMIN,
    ]);

    const teamMember = await this.teamMemberRepository.findOne({
      where: { id: memberId },
      relations: ['team'],
    });

    if (!teamMember || teamMember.team.projectId !== projectId) {
      throw new NotFoundException('Team member not found');
    }

    await this.teamMemberRepository.remove(teamMember);
  }

  private async checkUserPermission(
    projectId: string,
    userId: string,
    allowedRoles: RoleType[],
  ): Promise<void> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: {
        userId,
        team: { projectId },
      },
      relations: ['role'],
    });

    if (!teamMember) {
      throw new ForbiddenException('You are not a member of this project team');
    }

    if (!allowedRoles.includes(teamMember.role.name)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${allowedRoles.join(', ')}`,
      );
    }
  }
}
