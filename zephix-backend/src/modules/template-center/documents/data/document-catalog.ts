/**
 * TC-B6 — Starter document catalog (single source of truth).
 *
 * The 8 catalog document templates + the getting-started guide that Zephix
 * ships out of the box. Each entry is:
 *   1. A `doc_templates` row (docKey-keyed, rich_text default content), AND
 *   2. A `templates` row (kind='document', SYSTEM, methodology NULL) so the
 *      Template Center browses documents as first-class catalog citizens.
 *
 * Linkage between the two: the `templates` row carries `metadata.docKey`
 * (JSONB — no migration). See {@link buildDocumentTemplateMetadata}.
 *
 * defaultContent is a deterministic rich_text block document. Merge tokens
 * (e.g. {{project.name}}) are embedded verbatim; they resolve ONCE at
 * instance creation from live project data (see MergeFieldResolverService).
 *
 * Copy is internal-quality skeleton content. It intentionally uses NO
 * methodology/framework names in user-facing text (Zephix product rule).
 */

export type DocContentType = 'rich_text' | 'file' | 'link' | 'form';

/** A rich_text block. Minimal, deterministic shape the FE editor rehydrates. */
export interface RichTextBlock {
  type: 'heading' | 'paragraph' | 'bullet';
  /** Heading level 1..3; ignored for paragraph/bullet. */
  level?: 1 | 2 | 3;
  text: string;
}

export interface RichTextContent {
  format: 'rich_text';
  version: 1;
  blocks: RichTextBlock[];
}

export interface DocumentCatalogEntry {
  /** Stable kebab-case key. Canonical identity across doc_templates + templates. */
  docKey: string;
  name: string;
  /** initiation | planning | execution | monitoring | change | closure | guide */
  category: string;
  contentType: DocContentType;
  /** Human-friendly one-liner surfaced in the Center card. */
  description: string;
  defaultContent: RichTextContent;
}

const h = (level: 1 | 2 | 3, text: string): RichTextBlock => ({
  type: 'heading',
  level,
  text,
});
const p = (text: string): RichTextBlock => ({ type: 'paragraph', text });
const li = (text: string): RichTextBlock => ({ type: 'bullet', text });

const rt = (blocks: RichTextBlock[]): RichTextContent => ({
  format: 'rich_text',
  version: 1,
  blocks,
});

/**
 * The starter catalog. Order is stable and deterministic — seeds and proofs
 * rely on it. The final entry (getting-started-guide) is the onboarding guide.
 */
export const DOCUMENT_CATALOG: DocumentCatalogEntry[] = [
  {
    docKey: 'project-charter',
    name: 'Project Charter',
    category: 'initiation',
    contentType: 'rich_text',
    description:
      'Authorizes the project and captures its purpose, objectives, and success measures.',
    defaultContent: rt([
      h(1, 'Project Charter'),
      p('Project: {{project.name}}'),
      p('Project Manager: {{project.manager}}'),
      h(2, 'Purpose'),
      p('Describe why this project exists and the business need it addresses.'),
      h(2, 'Objectives'),
      li('Objective 1'),
      li('Objective 2'),
      h(2, 'Scope'),
      p('In scope and out of scope for this project.'),
      h(2, 'Success Measures'),
      p('How completion and success will be measured.'),
      h(2, 'Team'),
      p('Core team: {{team}}'),
      h(2, 'Milestones'),
      p('Key milestones: {{milestones}}'),
    ]),
  },
  {
    docKey: 'status-report',
    name: 'Status Report',
    category: 'monitoring',
    contentType: 'rich_text',
    description:
      'Periodic snapshot of progress, health, risks, and upcoming work.',
    defaultContent: rt([
      h(1, 'Status Report'),
      p('Project: {{project.name}}'),
      p('Prepared by: {{project.manager}}'),
      p('Current phase: {{project.phase}}'),
      p('Overall health: {{project.health}}'),
      h(2, 'Summary'),
      p('Brief narrative of progress since the last report.'),
      h(2, 'Accomplishments'),
      li('Completed item'),
      h(2, 'Upcoming Work'),
      li('Planned item'),
      h(2, 'Risks & Issues'),
      li('Open risk or issue'),
      h(2, 'Milestones'),
      p('{{milestones}}'),
    ]),
  },
  {
    docKey: 'raci-matrix',
    name: 'Responsibility Matrix',
    category: 'planning',
    contentType: 'rich_text',
    description:
      'Clarifies who is responsible, accountable, consulted, and informed for each activity.',
    defaultContent: rt([
      h(1, 'Responsibility Matrix'),
      p('Project: {{project.name}}'),
      p('Team: {{team}}'),
      h(2, 'How to Read This Matrix'),
      p(
        'For each activity, mark who is Responsible, Accountable, Consulted, and Informed.',
      ),
      h(2, 'Activities'),
      li('Activity — Responsible / Accountable / Consulted / Informed'),
    ]),
  },
  {
    docKey: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'execution',
    contentType: 'rich_text',
    description:
      'Structured record of discussion, decisions, and action items.',
    defaultContent: rt([
      h(1, 'Meeting Notes'),
      p('Project: {{project.name}}'),
      h(2, 'Attendees'),
      p('{{team}}'),
      h(2, 'Agenda'),
      li('Topic'),
      h(2, 'Decisions'),
      li('Decision made'),
      h(2, 'Action Items'),
      li('Action — owner — due date'),
    ]),
  },
  {
    docKey: 'statement-of-work',
    name: 'Statement of Work',
    category: 'initiation',
    contentType: 'rich_text',
    description:
      'Defines the deliverables, timeline, and terms for the work to be performed.',
    defaultContent: rt([
      h(1, 'Statement of Work'),
      p('Project: {{project.name}}'),
      p('Project Manager: {{project.manager}}'),
      h(2, 'Background'),
      p('Context and reason for the engagement.'),
      h(2, 'Scope of Work'),
      p('Detailed description of the work to be delivered.'),
      h(2, 'Deliverables'),
      li('Deliverable 1'),
      h(2, 'Timeline'),
      p('Key dates and milestones: {{milestones}}'),
      h(2, 'Assumptions & Terms'),
      p('Assumptions, constraints, and acceptance criteria.'),
    ]),
  },
  {
    docKey: 'lessons-learned',
    name: 'Lessons Learned',
    category: 'closure',
    contentType: 'rich_text',
    description:
      'Captures what went well and what to improve for future projects.',
    defaultContent: rt([
      h(1, 'Lessons Learned'),
      p('Project: {{project.name}}'),
      h(2, 'What Went Well'),
      li('Strength to repeat'),
      h(2, 'What Could Improve'),
      li('Area to improve'),
      h(2, 'Recommendations'),
      li('Recommendation for future projects'),
    ]),
  },
  {
    docKey: 'closeout-report',
    name: 'Closeout Report',
    category: 'closure',
    contentType: 'rich_text',
    description:
      'Formally closes the project and summarizes outcomes against objectives.',
    defaultContent: rt([
      h(1, 'Closeout Report'),
      p('Project: {{project.name}}'),
      p('Project Manager: {{project.manager}}'),
      p('Final health: {{project.health}}'),
      h(2, 'Outcome Summary'),
      p('Summary of results against the original objectives.'),
      h(2, 'Deliverables Accepted'),
      li('Accepted deliverable'),
      h(2, 'Open Items at Closure'),
      li('Outstanding item, if any'),
      h(2, 'Final Milestones'),
      p('{{milestones}}'),
    ]),
  },
  {
    docKey: 'risk-response-plan',
    name: 'Risk Response Plan',
    category: 'planning',
    contentType: 'rich_text',
    description:
      'Documents identified risks and the planned response for each.',
    defaultContent: rt([
      h(1, 'Risk Response Plan'),
      p('Project: {{project.name}}'),
      p('Owner: {{project.manager}}'),
      h(2, 'Risk Register'),
      li('Risk — likelihood — impact — response — owner'),
      h(2, 'Response Strategies'),
      p('Avoid, mitigate, transfer, or accept — with rationale.'),
      h(2, 'Monitoring'),
      p('How risks will be tracked and reviewed over time.'),
    ]),
  },
  {
    docKey: 'getting-started-guide',
    name: 'Getting Started Guide',
    category: 'guide',
    contentType: 'rich_text',
    description:
      'Orientation for the team: how this project is organized and how to work in it.',
    defaultContent: rt([
      h(1, 'Getting Started'),
      p('Welcome to {{project.name}}.'),
      p('Your project manager is {{project.manager}}.'),
      h(2, 'How This Project Is Organized'),
      p('An overview of the phases and how work moves through them.'),
      h(2, 'Where to Find Things'),
      li('Tasks and boards'),
      li('Documents'),
      li('Reports and dashboards'),
      h(2, 'Who to Ask'),
      p('Core team: {{team}}'),
    ]),
  },
  {
    // TC-C2: Definition of Done — the team-agreed completion checklist,
    // bundled by the Scrum Delivery template (T6).
    docKey: 'definition-of-done',
    name: 'Definition of Done',
    category: 'execution',
    contentType: 'rich_text',
    description:
      'Team-agreed checklist of criteria that mark a task or increment complete.',
    defaultContent: rt([
      h(1, 'Definition of Done'),
      p('Project: {{project.name}}'),
      h(2, 'A work item is Done when'),
      li('Acceptance criteria are met'),
      li('Code is reviewed and approved'),
      li('Tests pass (unit and integration)'),
      li('Documentation is updated'),
      li('The increment is demoable'),
      h(2, 'Notes'),
      p('Adjust this checklist to match how your team defines quality.'),
    ]),
  },
  {
    // TC-C3: Release Checklist — bundled by the Release Planning template (T12).
    docKey: 'release-checklist',
    name: 'Release Checklist',
    category: 'execution',
    contentType: 'rich_text',
    description:
      'Step-by-step checklist to cut, verify, and ship a release safely.',
    defaultContent: rt([
      h(1, 'Release Checklist'),
      p('Project: {{project.name}}'),
      h(2, 'Before the Cut'),
      li('Scope frozen and communicated'),
      li('Release notes drafted'),
      h(2, 'Cut and Verify'),
      li('Branch cut and tagged'),
      li('Regression and smoke suites pass'),
      h(2, 'Deploy'),
      li('Rollout plan and rollback trigger agreed'),
      li('Monitoring and on-call in place'),
    ]),
  },
  {
    // TC-C3: Go / No-Go decision record — bundled by Release Planning (T12).
    docKey: 'go-no-go',
    name: 'Go / No-Go Decision',
    category: 'execution',
    contentType: 'rich_text',
    description:
      'Records the release readiness decision and the criteria behind it.',
    defaultContent: rt([
      h(1, 'Go / No-Go Decision'),
      p('Project: {{project.name}}'),
      p('Decision owner: {{project.manager}}'),
      h(2, 'Readiness Criteria'),
      li('Tests pass and coverage is acceptable'),
      li('Known issues reviewed and accepted'),
      li('Rollback plan verified'),
      h(2, 'Decision'),
      p('Go or No-Go, with rationale and date.'),
    ]),
  },
];

/** Fast lookup by docKey. */
export const DOCUMENT_CATALOG_BY_KEY: Record<string, DocumentCatalogEntry> =
  DOCUMENT_CATALOG.reduce(
    (acc, d) => {
      acc[d.docKey] = d;
      return acc;
    },
    {} as Record<string, DocumentCatalogEntry>,
  );

/** All valid catalog doc keys (used to validate blocksGateKey targets etc.). */
export const DOCUMENT_CATALOG_KEYS: string[] = DOCUMENT_CATALOG.map(
  (d) => d.docKey,
);

/**
 * Metadata payload written onto the `templates` row for a catalog document.
 * `docKey` is the linkage back to the doc_templates content row.
 */
export function buildDocumentTemplateMetadata(entry: DocumentCatalogEntry): {
  docKey: string;
  category: string;
  contentType: string;
  origin: 'system_document_catalog';
} {
  return {
    docKey: entry.docKey,
    category: entry.category,
    contentType: entry.contentType,
    origin: 'system_document_catalog',
  };
}
