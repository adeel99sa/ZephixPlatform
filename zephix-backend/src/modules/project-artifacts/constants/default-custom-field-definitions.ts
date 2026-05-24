import {
  CustomFieldDefinition,
  ProjectArtifactType,
} from '../entities/project-artifact.entity';

/**
 * Default custom_field_definitions seeded on artifact creation when the
 * caller does not supply their own. Covers the five Sprint 5.1 artifact
 * types per dispatch Part 5; remaining types (status_report, backlog,
 * sprint_ceremonies, user_story, brd, custom) default to empty.
 *
 * Values aligned to PMBOK reference fields where applicable.
 */
export const DEFAULT_CUSTOM_FIELD_DEFINITIONS: Partial<
  Record<ProjectArtifactType, CustomFieldDefinition[]>
> = {
  risk_register: [
    {
      id: 'probability',
      name: 'Probability',
      type: 'enum',
      enumValues: ['Low', 'Medium', 'High'],
      required: true,
      displayOrder: 1,
    },
    {
      id: 'impact',
      name: 'Impact',
      type: 'enum',
      enumValues: ['Low', 'Medium', 'High'],
      required: true,
      displayOrder: 2,
    },
    {
      id: 'risk_score',
      name: 'Risk Score',
      type: 'number',
      required: false,
      displayOrder: 3,
    },
    {
      id: 'mitigation',
      name: 'Mitigation Strategy',
      type: 'text',
      required: false,
      displayOrder: 4,
    },
    {
      id: 'category',
      name: 'Category',
      type: 'enum',
      enumValues: [
        'Technical',
        'Schedule',
        'Budget',
        'Resource',
        'Quality',
        'External',
      ],
      required: false,
      displayOrder: 5,
    },
  ],
  raid_log: [
    {
      id: 'item_type',
      name: 'Type',
      type: 'enum',
      enumValues: ['Risk', 'Assumption', 'Issue', 'Dependency'],
      required: true,
      displayOrder: 1,
    },
    {
      id: 'category',
      name: 'Category',
      type: 'enum',
      enumValues: ['Technical', 'Process', 'External', 'Resource'],
      required: false,
      displayOrder: 2,
    },
    {
      id: 'impact_description',
      name: 'Impact',
      type: 'text',
      required: false,
      displayOrder: 3,
    },
    {
      id: 'resolution',
      name: 'Resolution / Mitigation',
      type: 'text',
      required: false,
      displayOrder: 4,
    },
  ],
  lessons_learned: [
    {
      id: 'phase',
      name: 'Project Phase',
      type: 'enum',
      enumValues: [
        'Pre-Planning',
        'Planning',
        'Execution',
        'Monitoring',
        'Closure',
      ],
      required: true,
      displayOrder: 1,
    },
    {
      id: 'detailed_description',
      name: 'Detailed Description',
      type: 'text',
      required: true,
      displayOrder: 2,
    },
    {
      id: 'impact',
      name: 'Impact',
      type: 'enum',
      enumValues: ['Positive', 'Negative', 'Neutral'],
      required: true,
      displayOrder: 3,
    },
    {
      id: 'recommendation',
      name: 'Recommendation',
      type: 'text',
      required: false,
      displayOrder: 4,
    },
  ],
  decision_log: [
    {
      id: 'decision_date',
      name: 'Decision Date',
      type: 'date',
      required: true,
      displayOrder: 1,
    },
    {
      id: 'context',
      name: 'Context',
      type: 'text',
      required: true,
      displayOrder: 2,
    },
    {
      id: 'options_considered',
      name: 'Options Considered',
      type: 'text',
      required: false,
      displayOrder: 3,
    },
    {
      id: 'rationale',
      name: 'Rationale',
      type: 'text',
      required: true,
      displayOrder: 4,
    },
    {
      id: 'decision_maker',
      name: 'Decision Maker',
      type: 'person',
      required: false,
      displayOrder: 5,
    },
  ],
  stakeholder_register: [
    {
      id: 'role',
      name: 'Role / Title',
      type: 'text',
      required: true,
      displayOrder: 1,
    },
    {
      id: 'organization',
      name: 'Organization',
      type: 'text',
      required: false,
      displayOrder: 2,
    },
    {
      id: 'interest',
      name: 'Interest Level',
      type: 'enum',
      enumValues: ['High', 'Medium', 'Low'],
      required: true,
      displayOrder: 3,
    },
    {
      id: 'influence',
      name: 'Influence Level',
      type: 'enum',
      enumValues: ['High', 'Medium', 'Low'],
      required: true,
      displayOrder: 4,
    },
    {
      id: 'engagement_strategy',
      name: 'Engagement Strategy',
      type: 'enum',
      enumValues: [
        'Manage Closely',
        'Keep Satisfied',
        'Keep Informed',
        'Monitor',
      ],
      required: false,
      displayOrder: 5,
    },
  ],
};

export const ARTIFACT_TYPE_VALUES: ProjectArtifactType[] = [
  'risk_register',
  'raid_log',
  'lessons_learned',
  'status_report',
  'decision_log',
  'stakeholder_register',
  'backlog',
  'sprint_ceremonies',
  'user_story',
  'brd',
  'custom',
];
