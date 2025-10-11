export const WATERFALL_TEMPLATE = {
    id: 'waterfall-system-v1',
    name: 'Waterfall Project',
    methodology: 'waterfall',
    is_system: true,
    structure: {
        phases: [
            { name: 'Initiation', order: 1, duration_weeks: 2, deliverables: ['Project Charter', 'Stakeholder Register'] },
            { name: 'Planning', order: 2, duration_weeks: 4, deliverables: ['WBS', 'Schedule', 'Budget'] },
            { name: 'Execution', order: 3, duration_weeks: 12, deliverables: ['Deliverables', 'Status Reports'] },
            { name: 'Monitoring', order: 4, duration_weeks: 0, deliverables: ['Change Requests', 'Risk Log'] },
            { name: 'Closure', order: 5, duration_weeks: 1, deliverables: ['Lessons Learned', 'Final Report'] }
        ]
    },
    metrics: ['schedule_variance', 'budget_variance']
};

export const SCRUM_TEMPLATE = {
    id: 'scrum-system-v1',
    name: 'Scrum Project',
    methodology: 'scrum',
    is_system: true,
    structure: {
        sprint_length_days: 14,
        ceremonies: ['Sprint Planning', 'Daily Standup', 'Sprint Review', 'Sprint Retro'],
        artifacts: ['Product Backlog', 'Sprint Backlog', 'Increment']
    },
    metrics: ['velocity', 'burndown']
};
