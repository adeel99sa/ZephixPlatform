export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  includes: string[];
  methodology: string;
  estimatedSetup: string;
  teamSize: string;
  tags: string[];
}

export const projectTemplates: Template[] = [
  {
    id: 'agile-scrum',
    name: 'Agile Scrum Project',
    category: 'Agile',
    description: '2-week sprints with backlog, velocity tracking, and burndown charts',
    thumbnail: '/templates/agile-scrum.png',
    includes: ['Sprint structure', 'User stories', 'Velocity KPIs', 'Daily standups'],
    methodology: 'agile',
    estimatedSetup: '10 minutes',
    teamSize: '5-9 people',
    tags: ['Agile', '2 weeks sprint', 'Scrum']
  },
  {
    id: 'waterfall-construction',
    name: 'Construction Project',
    category: 'Construction',
    description: 'Sequential phases with Gantt chart, milestones, and resource planning',
    thumbnail: '/templates/construction.png',
    includes: ['Phase gates', 'Dependencies', 'Resource allocation', 'Budget tracking'],
    methodology: 'waterfall',
    estimatedSetup: '15 minutes',
    teamSize: '10-20 people',
    tags: ['Waterfall', 'Construction', 'Gantt']
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    category: 'Marketing',
    description: 'End-to-end campaign planning with content calendar and performance tracking',
    thumbnail: '/templates/marketing.png',
    includes: ['Content calendar', 'Budget tracking', 'Performance KPIs', 'Team coordination'],
    methodology: 'hybrid',
    estimatedSetup: '8 minutes',
    teamSize: '3-8 people',
    tags: ['Marketing', 'Campaign', 'Content']
  },
  {
    id: 'it-infrastructure',
    name: 'IT Infrastructure Project',
    category: 'IT',
    description: 'System deployment with technical milestones and risk management',
    thumbnail: '/templates/it-infrastructure.png',
    includes: ['Technical milestones', 'Risk assessment', 'Deployment phases', 'Testing cycles'],
    methodology: 'waterfall',
    estimatedSetup: '12 minutes',
    teamSize: '8-15 people',
    tags: ['IT', 'Infrastructure', 'Deployment']
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'Marketing',
    description: 'Complete product launch with go-to-market strategy and timeline',
    thumbnail: '/templates/product-launch.png',
    includes: ['Launch timeline', 'Marketing activities', 'Sales enablement', 'Success metrics'],
    methodology: 'hybrid',
    estimatedSetup: '20 minutes',
    teamSize: '10-25 people',
    tags: ['Product', 'Launch', 'GTM']
  },
  {
    id: 'kanban-board',
    name: 'Kanban Workflow',
    category: 'Agile',
    description: 'Continuous flow with work-in-progress limits and cycle time tracking',
    thumbnail: '/templates/kanban.png',
    includes: ['WIP limits', 'Cycle time', 'Flow metrics', 'Continuous delivery'],
    methodology: 'agile',
    estimatedSetup: '5 minutes',
    teamSize: '3-7 people',
    tags: ['Kanban', 'Flow', 'Continuous']
  },
  {
    id: 'event-planning',
    name: 'Event Planning',
    category: 'Marketing',
    description: 'Comprehensive event planning with vendor management and timeline',
    thumbnail: '/templates/event-planning.png',
    includes: ['Vendor management', 'Timeline coordination', 'Budget tracking', 'Logistics'],
    methodology: 'waterfall',
    estimatedSetup: '18 minutes',
    teamSize: '5-12 people',
    tags: ['Event', 'Planning', 'Logistics']
  },
  {
    id: 'software-development',
    name: 'Software Development',
    category: 'IT',
    description: 'Full development lifecycle with code reviews and deployment pipeline',
    thumbnail: '/templates/software-dev.png',
    includes: ['Development phases', 'Code reviews', 'Testing cycles', 'Deployment'],
    methodology: 'agile',
    estimatedSetup: '25 minutes',
    teamSize: '6-12 people',
    tags: ['Software', 'Development', 'DevOps']
  },
  {
    id: 'research-project',
    name: 'Research Project',
    category: 'IT',
    description: 'Structured research with hypothesis testing and data analysis phases',
    thumbnail: '/templates/research.png',
    includes: ['Research phases', 'Data collection', 'Analysis milestones', 'Reporting'],
    methodology: 'waterfall',
    estimatedSetup: '14 minutes',
    teamSize: '4-10 people',
    tags: ['Research', 'Data', 'Analysis']
  },
  {
    id: 'hybrid-agile',
    name: 'Hybrid Agile Project',
    category: 'Agile',
    description: 'Combines agile sprints with waterfall planning for complex projects',
    thumbnail: '/templates/hybrid.png',
    includes: ['Sprint planning', 'Phase gates', 'Risk management', 'Stakeholder reviews'],
    methodology: 'hybrid',
    estimatedSetup: '22 minutes',
    teamSize: '8-20 people',
    tags: ['Hybrid', 'Complex', 'Planning']
  }
];




