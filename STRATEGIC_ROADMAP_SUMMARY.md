# Strategic Roadmap Summary

**Date:** January 15, 2026
**Based on:** LinkedIn pain points and ClickUp differentiation

---

## Key Differentiators Mapped

### ✅ Implemented
1. **Templates as Control Plane** - Template snapshot, default KPIs
2. **KPI Lego System** - Toggle-based, template-driven
3. **Strict Hierarchy** - Workspace > Program > Project > Phase > Task
4. **My Work** - Unified on WorkTask, workspace-scoped
5. **Simple Role Model** - Platform + Workspace roles
6. **Zero Config Path** - Templates with defaults

### 🚧 In Progress
1. **Auto Status and Health** - Health computed, needs scheduled job + override
2. **Computed KPIs** - Basic pipeline exists, needs enhancement

### ⚠️ Next
1. **Manual KPI Values** - Storage and UI
2. **Resource Profiles** - Core governance feature
3. **Inbox** - First-class notification system
4. **Template Versioning** - Control plane enhancement

---

## MVP Completion Checklist

### Before Testers
- [x] Phase 1: Core execution
- [x] Phase 2: KPI lego system (MVP)
- [ ] Phase 2a: Manual KPI values (CRITICAL)
- [x] Phase 3: Auto health (partial)

### After Testers
- [ ] Phase 3a: Status engine scheduled job
- [ ] Phase 3b: Manual override
- [ ] Phase 4: Resource profiles and allocation
- [ ] Phase 5: Inbox feature

---

## Next Action

**Priority:** Complete Phase 2a (Manual KPI values) before MVP testers

**Why:** Testers need to enter manual KPI values to validate the full KPI lego system

**Files to Create:**
- `ProjectKpiValue` entity
- Manual KPI value endpoints
- Manual KPI input UI in project overview

---

**Status:** Strategic mapping complete. Ready to execute Phase 2a or proceed with smoke test.
