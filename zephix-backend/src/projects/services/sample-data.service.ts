import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus, ProjectPriority } from '../entities/project.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Role, RoleType } from '../entities/role.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Sample data service for generating test projects and team data
 * 
 * This service creates sample projects for users to demonstrate the application's
 * project management capabilities. It generates realistic project data with
 * proper team structures and role assignments.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
@Injectable()
export class SampleDataService implements OnModuleInit {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Initialize sample data when the module starts
   * Creates sample projects for existing users
   */
  async onModuleInit() {
    await this.createSampleProjects();
  }

  /**
   * Creates sample projects for existing users
   * Generates realistic project data with proper team structures
   */
  private async createSampleProjects(): Promise<void> {
    try {
      // Get existing users
      const users = await this.userRepository.find();
      
      if (users.length === 0) {
        console.log('⚠️ No users found for sample data creation');
        return;
      }

      // Get roles
      const roles = await this.roleRepository.find();
      if (roles.length === 0) {
        console.log('⚠️ No roles found for sample data creation');
        return;
      }

      // Create sample projects for each user
      for (const user of users) {
        await this.createUserSampleProjects(user, roles);
      }

      console.log('✅ Sample projects created successfully');
    } catch (error) {
      console.error('❌ Error creating sample projects:', error);
    }
  }

  /**
   * Creates sample projects for a specific user
   * 
   * @param user - The user to create projects for
   * @param roles - Available roles for team members
   */
  private async createUserSampleProjects(user: User, roles: Role[]): Promise<void> {
    const sampleProjects = this.generateSampleProjects(user);
    
    for (const projectData of sampleProjects) {
      // Check if project already exists for this user
      const existingProject = await this.projectRepository.findOne({
        where: { 
          name: projectData.name,
          createdById: user.id 
        }
      });

      if (existingProject) {
        console.log(`⏭️ Project "${projectData.name}" already exists for user ${user.email}`);
        continue;
      }

      // Create project
      const project = this.projectRepository.create({
        ...projectData,
        createdBy: user,
      });

      const savedProject = await this.projectRepository.save(project);

      // Create team for the project
      const team = this.teamRepository.create({
        name: `${savedProject.name} Team`,
        description: `Team for ${savedProject.name} project`,
        project: savedProject,
      });

      const savedTeam = await this.teamRepository.save(team);

      // Add creator as admin
      const adminRole = roles.find(role => role.name === RoleType.ADMIN);
      if (adminRole) {
        const teamMember = this.teamMemberRepository.create({
          team: savedTeam,
          user,
          role: adminRole,
          joinedAt: new Date(),
        });
        await this.teamMemberRepository.save(teamMember);
      }

      console.log(`✅ Created sample project: ${projectData.name} for user ${user.email}`);
    }
  }

  /**
   * Generates sample project data for a user
   * Creates realistic project scenarios with different statuses and priorities
   * 
   * @param user - The user to generate projects for
   * @returns Array of sample project data
   */
  private generateSampleProjects(user: User): Array<Partial<Project>> {
    const sampleProjects = [
      {
        name: 'Zephix Platform MVP',
        description: 'Core platform development for project management and team collaboration. This project focuses on building the essential features needed for the MVP release.',
        status: ProjectStatus.ACTIVE,
        priority: ProjectPriority.HIGH,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-30'),
        budget: 50000.00,
        businessRequirementsDocument: 'Comprehensive BRD for Zephix Platform MVP including user authentication, project management, and team collaboration features.',
      },
      {
        name: 'AI Integration Research',
        description: 'Research and development project for integrating artificial intelligence capabilities into the Zephix platform. Exploring machine learning algorithms for project optimization.',
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31'),
        budget: 25000.00,
        businessRequirementsDocument: 'AI integration research document covering machine learning models, data processing requirements, and implementation strategies.',
      },
      {
        name: 'Mobile App Development',
        description: 'Development of native mobile applications for iOS and Android platforms. Creating responsive and intuitive mobile interfaces for the Zephix platform.',
        status: ProjectStatus.ON_HOLD,
        priority: ProjectPriority.MEDIUM,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-30'),
        budget: 75000.00,
        businessRequirementsDocument: 'Mobile app development requirements including UI/UX design, platform-specific features, and performance optimization.',
      },
      {
        name: 'Enterprise Security Audit',
        description: 'Comprehensive security audit and implementation of enterprise-grade security measures. Ensuring data protection and compliance with industry standards.',
        status: ProjectStatus.ACTIVE,
        priority: ProjectPriority.CRITICAL,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-31'),
        budget: 35000.00,
        businessRequirementsDocument: 'Security audit requirements document covering penetration testing, vulnerability assessment, and compliance frameworks.',
      },
      {
        name: 'User Experience Optimization',
        description: 'UX/UI optimization project to improve user engagement and satisfaction. Implementing user feedback and conducting usability studies.',
        status: ProjectStatus.COMPLETED,
        priority: ProjectPriority.LOW,
        startDate: new Date('2023-10-01'),
        endDate: new Date('2024-01-31'),
        budget: 15000.00,
        businessRequirementsDocument: 'UX optimization requirements including user research, interface design improvements, and usability testing protocols.',
      },
    ];

    return sampleProjects;
  }

  /**
   * Creates a specific sample project for testing purposes
   * 
   * @param user - The user to create the project for
   * @param projectName - Name of the project to create
   * @returns The created project
   */
  async createSpecificSampleProject(user: User, projectName: string): Promise<Project> {
    const roles = await this.roleRepository.find();
    const adminRole = roles.find(role => role.name === RoleType.ADMIN);

    if (!adminRole) {
      throw new Error('Admin role not found');
    }

    // Create project
    const project = this.projectRepository.create({
      name: projectName,
      description: `Sample project: ${projectName}`,
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.MEDIUM,
      createdBy: user,
    });

    const savedProject = await this.projectRepository.save(project);

    // Create team
    const team = this.teamRepository.create({
      name: `${savedProject.name} Team`,
      description: `Team for ${savedProject.name} project`,
      project: savedProject,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Add user as admin
    const teamMember = this.teamMemberRepository.create({
      team: savedTeam,
      user,
      role: adminRole,
      joinedAt: new Date(),
    });

    await this.teamMemberRepository.save(teamMember);

    return savedProject;
  }
} 