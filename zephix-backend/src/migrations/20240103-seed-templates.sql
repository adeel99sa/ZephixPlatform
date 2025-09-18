-- Insert System Templates
INSERT INTO project_templates (name, methodology, description, is_system, default_phases, default_kpis, default_views) VALUES
('Agile Sprint', 'agile', 'Agile methodology with sprint-based execution', true, 
  '[{"name": "Planning", "duration": 2}, {"name": "Development", "duration": 10}, {"name": "Review", "duration": 1}, {"name": "Release", "duration": 1}]',
  '[{"name": "Sprint Velocity", "type": "velocity"}, {"name": "Burndown Rate", "type": "burndown"}, {"name": "Team Capacity", "type": "capacity"}]',
  '["board", "timeline", "metrics"]'
),
('Waterfall Project', 'waterfall', 'Traditional waterfall with sequential phases', true,
  '[{"name": "Requirements", "duration": 5}, {"name": "Design", "duration": 10}, {"name": "Implementation", "duration": 20}, {"name": "Testing", "duration": 10}, {"name": "Deployment", "duration": 5}]',
  '[{"name": "Phase Completion", "type": "completion"}, {"name": "Budget Variance", "type": "budget"}, {"name": "Milestone Adherence", "type": "milestone"}]',
  '["gantt", "milestones", "budget"]'
),
('Scrum Framework', 'scrum', 'Scrum with ceremonies and roles', true,
  '[{"name": "Sprint Planning", "duration": 1}, {"name": "Sprint", "duration": 14}, {"name": "Sprint Review", "duration": 1}, {"name": "Retrospective", "duration": 1}]',
  '[{"name": "Sprint Velocity", "type": "velocity"}, {"name": "Story Points", "type": "points"}, {"name": "Sprint Burndown", "type": "burndown"}]',
  '["board", "backlog", "burndown"]'
),
('Kanban Flow', 'kanban', 'Continuous flow with WIP limits', true,
  '[{"name": "Continuous", "duration": 0}]',
  '[{"name": "Lead Time", "type": "leadtime"}, {"name": "Cycle Time", "type": "cycletime"}, {"name": "Throughput", "type": "throughput"}, {"name": "WIP", "type": "wip"}]',
  '["board", "cumulative", "metrics"]'
),
('Generic Project', 'generic', 'Blank template for custom configuration', true,
  '[]',
  '[{"name": "Progress", "type": "progress"}, {"name": "Budget", "type": "budget"}]',
  '["list", "timeline"]'
);

-- Insert Lego Blocks
INSERT INTO lego_blocks (name, type, category, description, configuration, compatible_methodologies) VALUES
-- KPI Blocks
('Resource Utilization', 'kpi', 'resources', 'Track resource allocation percentage', 
  '{"metric": "allocation_percentage", "threshold_warning": 80, "threshold_critical": 100}',
  '["agile", "waterfall", "scrum", "kanban", "generic"]'
),
('Budget Burn Rate', 'kpi', 'finance', 'Monitor budget consumption rate',
  '{"metric": "budget_burn", "calculation": "spent/allocated", "period": "weekly"}',
  '["waterfall", "generic"]'
),
('Sprint Velocity', 'kpi', 'agile', 'Track team velocity over sprints',
  '{"metric": "velocity", "calculation": "story_points/sprint", "rolling_average": 3}',
  '["agile", "scrum"]'
),
('Risk Score', 'kpi', 'risk', 'Overall project risk assessment',
  '{"metric": "risk_score", "factors": ["schedule", "budget", "resources", "scope"]}',
  '["agile", "waterfall", "scrum", "kanban", "generic"]'
),
-- Phase Blocks
('Quality Gate', 'phase', 'governance', 'Approval gate between phases',
  '{"type": "approval", "approvers": ["pm", "stakeholder"], "criteria": ["deliverables", "budget", "quality"]}',
  '["waterfall", "generic"]'
),
('Sprint Review', 'phase', 'agile', 'Sprint review and demo',
  '{"type": "ceremony", "duration": 2, "participants": ["team", "po", "stakeholders"]}',
  '["agile", "scrum"]'
),
-- View Blocks
('Resource Heat Map', 'view', 'resources', 'Visual resource allocation map',
  '{"type": "heatmap", "data_source": "resource_allocations", "grouping": "weekly"}',
  '["agile", "waterfall", "scrum", "kanban", "generic"]'
),
('Gantt Timeline', 'view', 'planning', 'Timeline with dependencies',
  '{"type": "gantt", "show_dependencies": true, "show_milestones": true}',
  '["waterfall", "generic"]'
),
('Kanban Board', 'view', 'execution', 'Card-based workflow board',
  '{"type": "board", "columns": ["todo", "in_progress", "review", "done"], "wip_limits": true}',
  '["kanban", "agile", "scrum"]'
),
-- Field Blocks
('Risk Register', 'field', 'risk', 'Track and manage risks',
  '{"fields": [{"name": "risk_type", "type": "select"}, {"name": "probability", "type": "number"}, {"name": "impact", "type": "number"}]}',
  '["agile", "waterfall", "scrum", "kanban", "generic"]'
),
('Budget Tracker', 'field', 'finance', 'Track budget and costs',
  '{"fields": [{"name": "allocated_budget", "type": "currency"}, {"name": "spent", "type": "currency"}, {"name": "remaining", "type": "calculated"}]}',
  '["waterfall", "generic"]'
),
-- Automation Blocks
('Overallocation Alert', 'automation', 'resources', 'Alert when resource overallocated',
  '{"trigger": "allocation > 100", "action": "notify", "recipients": ["pm", "resource_manager"]}',
  '["agile", "waterfall", "scrum", "kanban", "generic"]'
),
('Phase Completion', 'automation', 'workflow', 'Auto-progress on phase completion',
  '{"trigger": "all_tasks_complete", "action": "advance_phase", "notification": true}',
  '["waterfall", "generic"]'
);


