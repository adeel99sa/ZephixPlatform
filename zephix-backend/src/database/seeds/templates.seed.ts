import { DataSource } from 'typeorm';
import { ProjectTemplate } from '../../modules/templates/entities/project-template.entity';

/**
 * Seed system templates for Week 1
 * Run this after database migrations
 */
export async function seedTemplates(dataSource: DataSource): Promise<void> {
  const templateRepository = dataSource.getRepository(ProjectTemplate);

  // Check if our specific Week 1 templates already exist
  const week1TemplateNames = [
    'Agile Sprint',
    'Waterfall Project',
    'Kanban Project',
  ];
  const existingWeek1Templates = await templateRepository.find({
    where: [
      { name: 'Agile Sprint', isSystem: true },
      { name: 'Waterfall Project', isSystem: true },
      { name: 'Kanban Project', isSystem: true },
    ],
  });

  if (existingWeek1Templates.length >= 3) {
    console.log('Week 1 system templates already seeded. Skipping...');
    return;
  }

  // If some exist, remove them and re-seed
  if (existingWeek1Templates.length > 0) {
    console.log(
      `Found ${existingWeek1Templates.length} existing Week 1 templates. Removing and re-seeding...`,
    );
    await templateRepository.remove(existingWeek1Templates);
  }

  // 1. AGILE TEMPLATE
  const agileTemplate = templateRepository.create({
    name: 'Agile Sprint',
    description:
      'Complete Agile/Scrum project template with sprints, standups, and agile KPIs',
    methodology: 'agile',
    phases: [
      {
        name: 'Sprint Planning',
        description:
          'Plan sprint goals, select user stories, and estimate effort',
        order: 0,
        estimatedDurationDays: 1,
      },
      {
        name: 'Development',
        description: 'Build features, write code, and implement user stories',
        order: 1,
        estimatedDurationDays: 10,
      },
      {
        name: 'Testing',
        description: 'Test features, fix bugs, and ensure quality',
        order: 2,
        estimatedDurationDays: 3,
      },
      {
        name: 'Review & Retrospective',
        description:
          'Demo completed work, gather feedback, and improve process',
        order: 3,
        estimatedDurationDays: 1,
      },
    ],
    taskTemplates: [
      // Sprint Planning tasks
      {
        name: 'Backlog Grooming',
        description: 'Review and prioritize user stories in the backlog',
        estimatedHours: 2,
        phaseOrder: 0,
        assigneeRole: 'Product Owner',
        priority: 'high',
      },
      {
        name: 'Sprint Planning Meeting',
        description: 'Team meeting to select stories and create sprint plan',
        estimatedHours: 4,
        phaseOrder: 0,
        assigneeRole: 'Scrum Master',
        priority: 'high',
      },
      {
        name: 'Story Estimation',
        description: 'Estimate story points for selected user stories',
        estimatedHours: 2,
        phaseOrder: 0,
        assigneeRole: 'Development Team',
        priority: 'medium',
      },
      // Development tasks
      {
        name: 'Daily Standup',
        description: 'Daily 15-minute team sync meeting',
        estimatedHours: 0.25,
        phaseOrder: 1,
        assigneeRole: 'Development Team',
        priority: 'high',
      },
      {
        name: 'Feature Development',
        description: 'Implement user stories and features',
        estimatedHours: 40,
        phaseOrder: 1,
        assigneeRole: 'Developer',
        priority: 'high',
      },
      {
        name: 'Code Review',
        description: 'Review pull requests and provide feedback',
        estimatedHours: 8,
        phaseOrder: 1,
        assigneeRole: 'Senior Developer',
        priority: 'high',
      },
      // Testing tasks
      {
        name: 'Unit Testing',
        description: 'Write and run unit tests for new features',
        estimatedHours: 8,
        phaseOrder: 2,
        assigneeRole: 'Developer',
        priority: 'high',
      },
      {
        name: 'Integration Testing',
        description: 'Test feature integration with existing systems',
        estimatedHours: 4,
        phaseOrder: 2,
        assigneeRole: 'QA Engineer',
        priority: 'high',
      },
      {
        name: 'Bug Fixes',
        description: 'Fix issues found during testing',
        estimatedHours: 6,
        phaseOrder: 2,
        assigneeRole: 'Developer',
        priority: 'medium',
      },
      // Review tasks
      {
        name: 'Sprint Review',
        description: 'Demo completed features to stakeholders',
        estimatedHours: 2,
        phaseOrder: 3,
        assigneeRole: 'Product Owner',
        priority: 'high',
      },
      {
        name: 'Sprint Retrospective',
        description: 'Team meeting to discuss what went well and improvements',
        estimatedHours: 1,
        phaseOrder: 3,
        assigneeRole: 'Scrum Master',
        priority: 'medium',
      },
    ],
    availableKPIs: [
      {
        id: 'velocity',
        name: 'Velocity',
        description: 'Average story points completed per sprint',
        methodology: 'agile',
        calculationMethod: 'Sum of story points completed / Number of sprints',
        unit: 'story points',
      },
      {
        id: 'burndown',
        name: 'Burndown Chart',
        description: 'Visual representation of remaining work vs time',
        methodology: 'agile',
        calculationMethod:
          'Total story points - Completed story points per day',
        unit: 'story points',
      },
      {
        id: 'cycle_time',
        name: 'Cycle Time',
        description: 'Average time from work start to completion',
        methodology: 'agile',
        calculationMethod: 'Average(done_date - in_progress_date)',
        unit: 'hours',
      },
      {
        id: 'defect_rate',
        name: 'Defect Rate',
        description: 'Number of bugs found per story point',
        methodology: 'agile',
        calculationMethod: 'Total defects / Total story points',
        unit: 'defects/story point',
      },
      {
        id: 'lead_time',
        name: 'Lead Time',
        description: 'Time from story creation to completion',
        methodology: 'agile',
        calculationMethod: 'Average(done_date - created_date)',
        unit: 'hours',
      },
    ],
    defaultEnabledKPIs: ['velocity', 'burndown', 'cycle_time'],
    scope: 'organization',
    organizationId: null as any, // System templates have null org
    createdById: null as any, // System user
    isDefault: false,
    isSystem: true,
  });

  // 2. WATERFALL TEMPLATE
  const waterfallTemplate = templateRepository.create({
    name: 'Waterfall Project',
    description:
      'Traditional Waterfall methodology with sequential phases and EVM KPIs',
    methodology: 'waterfall',
    phases: [
      {
        name: 'Requirements',
        description: 'Gather and document project requirements',
        order: 0,
        estimatedDurationDays: 14,
      },
      {
        name: 'Design',
        description: 'Create system architecture and detailed design documents',
        order: 1,
        estimatedDurationDays: 21,
      },
      {
        name: 'Implementation',
        description: 'Develop the system according to design specifications',
        order: 2,
        estimatedDurationDays: 60,
      },
      {
        name: 'Testing',
        description: 'Comprehensive testing including UAT and system testing',
        order: 3,
        estimatedDurationDays: 21,
      },
      {
        name: 'Deployment',
        description: 'Deploy to production and go-live activities',
        order: 4,
        estimatedDurationDays: 7,
      },
    ],
    taskTemplates: [
      // Requirements tasks
      {
        name: 'Requirements Gathering',
        description: 'Meet with stakeholders to gather requirements',
        estimatedHours: 40,
        phaseOrder: 0,
        assigneeRole: 'Business Analyst',
        priority: 'high',
      },
      {
        name: 'Requirements Documentation',
        description: 'Document functional and non-functional requirements',
        estimatedHours: 32,
        phaseOrder: 0,
        assigneeRole: 'Business Analyst',
        priority: 'high',
      },
      {
        name: 'Requirements Review',
        description: 'Review and approve requirements document',
        estimatedHours: 8,
        phaseOrder: 0,
        assigneeRole: 'Project Manager',
        priority: 'high',
      },
      // Design tasks
      {
        name: 'Architecture Design',
        description: 'Design system architecture and high-level components',
        estimatedHours: 40,
        phaseOrder: 1,
        assigneeRole: 'Solution Architect',
        priority: 'high',
      },
      {
        name: 'Detailed Design',
        description: 'Create detailed design documents and specifications',
        estimatedHours: 60,
        phaseOrder: 1,
        assigneeRole: 'Senior Developer',
        priority: 'high',
      },
      {
        name: 'Design Review',
        description: 'Review design documents with stakeholders',
        estimatedHours: 16,
        phaseOrder: 1,
        assigneeRole: 'Project Manager',
        priority: 'high',
      },
      // Implementation tasks
      {
        name: 'Development',
        description: 'Implement features according to design specifications',
        estimatedHours: 320,
        phaseOrder: 2,
        assigneeRole: 'Developer',
        priority: 'high',
      },
      {
        name: 'Code Review',
        description: 'Review code for quality and adherence to standards',
        estimatedHours: 40,
        phaseOrder: 2,
        assigneeRole: 'Senior Developer',
        priority: 'high',
      },
      {
        name: 'Unit Testing',
        description: 'Write and execute unit tests',
        estimatedHours: 80,
        phaseOrder: 2,
        assigneeRole: 'Developer',
        priority: 'medium',
      },
      // Testing tasks
      {
        name: 'System Testing',
        description: 'Test complete system functionality',
        estimatedHours: 60,
        phaseOrder: 3,
        assigneeRole: 'QA Engineer',
        priority: 'high',
      },
      {
        name: 'User Acceptance Testing',
        description: 'Stakeholders test system against requirements',
        estimatedHours: 40,
        phaseOrder: 3,
        assigneeRole: 'Business Analyst',
        priority: 'high',
      },
      {
        name: 'Bug Fixes',
        description: 'Fix issues found during testing',
        estimatedHours: 32,
        phaseOrder: 3,
        assigneeRole: 'Developer',
        priority: 'high',
      },
      // Deployment tasks
      {
        name: 'Deployment Planning',
        description: 'Plan deployment activities and rollback procedures',
        estimatedHours: 8,
        phaseOrder: 4,
        assigneeRole: 'DevOps Engineer',
        priority: 'high',
      },
      {
        name: 'Production Deployment',
        description: 'Deploy system to production environment',
        estimatedHours: 16,
        phaseOrder: 4,
        assigneeRole: 'DevOps Engineer',
        priority: 'high',
      },
      {
        name: 'Go-Live Support',
        description: 'Provide support during go-live period',
        estimatedHours: 24,
        phaseOrder: 4,
        assigneeRole: 'Support Team',
        priority: 'high',
      },
    ],
    availableKPIs: [
      {
        id: 'earned_value',
        name: 'Earned Value',
        description: 'Budgeted cost of work actually performed',
        methodology: 'waterfall',
        calculationMethod: 'Budget * Actual % Complete',
        unit: 'currency',
      },
      {
        id: 'schedule_variance',
        name: 'Schedule Variance',
        description: 'Difference between earned value and planned value',
        methodology: 'waterfall',
        calculationMethod: 'EV - PV',
        unit: 'currency',
      },
      {
        id: 'cost_variance',
        name: 'Cost Variance',
        description: 'Difference between earned value and actual cost',
        methodology: 'waterfall',
        calculationMethod: 'EV - AC',
        unit: 'currency',
      },
      {
        id: 'cpi',
        name: 'Cost Performance Index',
        description: 'Ratio of earned value to actual cost',
        methodology: 'waterfall',
        calculationMethod: 'EV / AC',
        unit: 'ratio',
      },
      {
        id: 'spi',
        name: 'Schedule Performance Index',
        description: 'Ratio of earned value to planned value',
        methodology: 'waterfall',
        calculationMethod: 'EV / PV',
        unit: 'ratio',
      },
    ],
    defaultEnabledKPIs: [
      'earned_value',
      'schedule_variance',
      'cost_variance',
      'cpi',
      'spi',
    ],
    scope: 'organization',
    organizationId: null as any,
    createdById: null as any,
    isDefault: false,
    isSystem: true,
  });

  // 3. KANBAN TEMPLATE
  const kanbanTemplate = templateRepository.create({
    name: 'Kanban Project',
    description: 'Kanban workflow with continuous delivery and flow metrics',
    methodology: 'kanban',
    phases: [
      {
        name: 'Backlog',
        description: 'Prioritized list of work items ready to be started',
        order: 0,
        estimatedDurationDays: 0, // Continuous
      },
      {
        name: 'In Progress',
        description: 'Work items currently being worked on',
        order: 1,
        estimatedDurationDays: 0, // Continuous
      },
      {
        name: 'Testing',
        description: 'Work items being tested and validated',
        order: 2,
        estimatedDurationDays: 0, // Continuous
      },
      {
        name: 'Done',
        description: 'Completed work items ready for deployment',
        order: 3,
        estimatedDurationDays: 0, // Continuous
      },
    ],
    taskTemplates: [
      {
        name: 'Limit WIP',
        description: 'Enforce work-in-progress limits per column',
        estimatedHours: 0,
        phaseOrder: 1,
        assigneeRole: 'Team Lead',
        priority: 'high',
      },
      {
        name: 'Daily Review',
        description: 'Daily team review of board and blockers',
        estimatedHours: 0.5,
        phaseOrder: 1,
        assigneeRole: 'Team Lead',
        priority: 'high',
      },
      {
        name: 'Continuous Deployment',
        description: 'Deploy completed work items continuously',
        estimatedHours: 4,
        phaseOrder: 3,
        assigneeRole: 'DevOps Engineer',
        priority: 'high',
      },
      {
        name: 'Work Item Development',
        description: 'Develop work items from backlog',
        estimatedHours: 16,
        phaseOrder: 1,
        assigneeRole: 'Developer',
        priority: 'high',
      },
      {
        name: 'Work Item Testing',
        description: 'Test completed work items',
        estimatedHours: 4,
        phaseOrder: 2,
        assigneeRole: 'QA Engineer',
        priority: 'high',
      },
    ],
    availableKPIs: [
      {
        id: 'lead_time',
        name: 'Lead Time',
        description: 'Time from work item creation to completion',
        methodology: 'kanban',
        calculationMethod: 'Average(done_date - created_date)',
        unit: 'hours',
      },
      {
        id: 'throughput',
        name: 'Throughput',
        description: 'Number of work items completed per time period',
        methodology: 'kanban',
        calculationMethod: 'Count(completed_items) / Time_period',
        unit: 'items/week',
      },
      {
        id: 'wip',
        name: 'Work In Progress',
        description: 'Number of items currently in progress',
        methodology: 'kanban',
        calculationMethod: 'Count(items in "In Progress" status)',
        unit: 'items',
      },
      {
        id: 'flow_efficiency',
        name: 'Flow Efficiency',
        description:
          'Percentage of time work items are actively being worked on',
        methodology: 'kanban',
        calculationMethod: 'Active_time / Total_time * 100',
        unit: 'percentage',
      },
    ],
    defaultEnabledKPIs: ['lead_time', 'throughput', 'wip'],
    scope: 'organization',
    organizationId: null as any,
    createdById: null as any,
    isDefault: false,
    isSystem: true,
  });

  // Save all templates
  await templateRepository.save([
    agileTemplate,
    waterfallTemplate,
    kanbanTemplate,
  ]);

  console.log('✅ System templates seeded successfully:');
  console.log('  - Agile Sprint');
  console.log('  - Waterfall Project');
  console.log('  - Kanban Project');
}
