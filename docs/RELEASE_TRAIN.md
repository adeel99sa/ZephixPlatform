# Zephix Release Train

**Purpose:** Weekly release targets with strict change control

## Rules

1. **One release target per week**
2. **No new epics mid-week** (after Monday)
3. **Only bug fixes after Wednesday**
4. **All changes must have proof** (build, test, screenshot)

## Current Release: Week of 2026-01-18

**Target:** Core 6 Flows Pass on Local

**Locked:** ✅ YES - No new epics after Monday

**Focus Areas:**
1. ✅ Login - PASS (verified)
2. ✅ Home Page - PASS (verified)
3. ✅ Workspace Directory - PASS (verified)
4. ⚠️ Create Workspace - IN PROGRESS (needs end-to-end verification)
5. ❌ Create Project - NOT STARTED
6. ❌ Project Work Items - NOT STARTED

**Success Criteria:**
- All 6 core flows pass on local development environment
- No regressions in routing or workspace header rules
- Platform health page shows all flows passing
- Proof files updated for each flow

**No New Features:** Only bug fixes and flow completion

---

## Upcoming Releases

### Week of 2025-02-03
**Target:** Quality & Smoke Tests

**Focus Areas:**
- Platform health page
- Smoke test suite (5-10 tests)
- End-to-end flow verification
- Documentation updates

**No New Features:** Only quality improvements

---

### Week of 2025-02-10
**Target:** MVP Polish

**Focus Areas:**
- UI/UX polish
- Performance optimization
- Error handling improvements
- User feedback integration

**No New Features:** Only polish and optimization

---

## Release Process

### Monday: Planning
- Review previous week's progress
- Set release target
- Freeze scope (no new epics)

### Tuesday-Wednesday: Development
- Work on planned epics
- Daily standup updates
- Blockers identified and resolved

### Thursday-Friday: Bug Fixes Only
- No new features
- Only bug fixes and polish
- Final testing and verification

### Friday EOD: Release
- Deploy to production
- Update execution board
- Document what shipped

## Change Control

### Adding New Work
- **Monday:** New epics can be added to next week's release
- **Tuesday-Wednesday:** Only if critical blocker
- **Thursday-Friday:** Only bug fixes

### Emergency Changes
- Security fixes: Always allowed
- Data loss prevention: Always allowed
- Critical bugs: Requires approval

## Release Checklist

Before each release:
- [ ] All planned epics completed or moved to next week
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint:new`)
- [ ] Smoke tests pass (when available)
- [ ] Documentation updated
- [ ] Execution board updated
- [ ] Release notes prepared

## Release Notes Template

```markdown
## Release: Week of YYYY-MM-DD

### Completed
- Epic 1: Description
- Epic 2: Description

### Fixed
- Bug 1: Description
- Bug 2: Description

### Known Issues
- Issue 1: Description (if any)

### Next Week
- Epic 1: Description
- Epic 2: Description
```

## Notes

- **Strict adherence required** - No exceptions without approval
- **Proof required** - Every change must have build/test/screenshot
- **Scope freeze** - Prevents scope creep and maintains focus
