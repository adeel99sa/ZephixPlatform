const fs = require('fs');
const path = './src/modules/risks/entities/risk.entity.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix column mappings to use snake_case in database, camelCase in code
content = content.replace('@Column()', '@Column({ name: "project_id" })');
content = content.replace('projectId:', 'projectId:');

content = content.replace('@Column()', '@Column({ name: "organization_id" })');
content = content.replace('organizationId:', 'organizationId:');

content = content.replace('@Column()', '@Column({ name: "mitigation_plan" })');
content = content.replace('mitigationPlan:', 'mitigationPlan:');

content = content.replace('@Column()', '@Column({ name: "impact_score" })');
content = content.replace('impactScore:', 'impactScore:');

content = content.replace('@Column()', '@Column({ name: "risk_score" })');
content = content.replace('riskScore:', 'riskScore:');

content = content.replace('@Column()', '@Column({ name: "identified_by" })');
content = content.replace('identifiedBy:', 'identifiedBy:');

content = content.replace('@Column()', '@Column({ name: "assigned_to" })');
content = content.replace('assignedTo:', 'assignedTo:');

content = content.replace('@Column()', '@Column({ name: "due_date" })');
content = content.replace('dueDate:', 'dueDate:');

content = content.replace('@Column()', '@Column({ name: "resolved_at" })');
content = content.replace('resolvedAt:', 'resolvedAt:');

content = content.replace('@Column()', '@Column({ name: "resolution_notes" })');
content = content.replace('resolutionNotes:', 'resolutionNotes:');

content = content.replace('@Column()', '@Column({ name: "is_active" })');
content = content.replace('isActive:', 'isActive:');

fs.writeFileSync(path, content);
console.log('✅ Fixed entity to follow standards: camelCase in code, snake_case in DB');
