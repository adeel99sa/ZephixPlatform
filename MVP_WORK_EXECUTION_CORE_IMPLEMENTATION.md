# MVP Work Execution Core - Implementation Plan

**Date:** January 15, 2026
**Objective:** Build MVP-ready Work Execution Core

---

## Current State Verification

### ✅ Already Complete
1. WorkTask entity has all required fields
2. My Work uses WorkTask
3. Project has templateId, templateVersion, templateSnapshot, activeKpiIds
4. Template instantiation sets activeKpiIds
5. Program entity exists with workspace scoping
6. Program rollup service exists
7. Resource entities exist

### ⚠️ Needs Verification/Fixes
1. Frontend task endpoints (verify all use /work/tasks)
2. Workspace validation in frontend (hard failure checks)
3. Template snapshot persistence (verify templateVersion stored)
4. KPI validation rules (verify activeKpiIds subset check)
5. Resource management foundation (verify workspace scoping)
6. Status automation (verify health computation)
7. AI scaffolding (needs to be built)

---

## Implementation Steps

### PART 1: Task Model and Execution Consistency
- [x] Step 1: Verify WorkTask entity ✅
- [ ] Step 2: Verify frontend task usage
- [x] Step 3: Validate My Work ✅
- [ ] Step 4: Add hard failure checks

### PART 2: Template and Project Creation Flow
- [ ] Step 5: Template behavior verification
- [ ] Step 6: Project creation from template (verify templateVersion)
- [ ] Step 7: Custom templates (verify permissions)

### PART 3: KPI Lego System
- [x] Step 8: KPI data model ✅
- [ ] Step 9: KPI activation rules (verify validation)
- [x] Step 10: KPI UI behavior ✅
- [x] Step 11: Persistence ✅

### PART 4: Program Support Minimum
- [x] Step 12: Program entity ✅
- [ ] Step 13: Program rollups (verify health aggregation)

### PART 5: Resource Management Foundation
- [ ] Step 14: Resource model (verify workspace scoping)
- [ ] Step 15: Allocation (verify warnings)
- [ ] Step 16: Health integration

### PART 6: Governance and Status Automation
- [ ] Step 17: Status rules (verify computation)
- [ ] Step 18: Audit (verify audit trail)

### PART 7: AI Assistant Scaffolding
- [ ] Step 19: AI context engine
- [ ] Step 20: AI permissions
- [ ] Step 21: AI execution flow

### PART 8: Quality and Guardrails
- [ ] Step 22: No silent failures
- [ ] Step 23: No default workspace values
- [ ] Step 24: No duplicate API clients
- [ ] Step 25: No new libraries

---

**Status:** Starting implementation...
